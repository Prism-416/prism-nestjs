import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import {
  CreateFeatureProvisioningRequestDto,
  FeatureProvisioningRequestResponseDto,
} from '@/modules/workspace/dto';
import {
  FeatureProvisioningProjectNotFoundError,
  FeatureProvisioningRequestNotFoundError,
  WorkspaceNotFoundError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { FeatureProvisioningDispatchService } from '@/modules/workspace/services';
import type {
  FeatureProvisioningPayload,
  FeatureProvisioningRequestRow,
  WorkspaceMemberRow,
  WorkspaceProjectSummaryRow,
  WorkspaceRow,
} from '@/modules/workspace/types';

const DISPATCH_ERROR_MESSAGE_MAX_LENGTH = 1000;

@Injectable()
export class FeatureProvisioningUseCase {
  constructor(
    private readonly repo: WorkspaceRepository,
    private readonly uow: UnitOfWork,
    private readonly dispatchService: FeatureProvisioningDispatchService,
  ) {}

  async createFeatureProvisioningRequest(
    userId: string,
    workspaceId: string,
    dto: CreateFeatureProvisioningRequestDto,
  ): Promise<FeatureProvisioningRequestResponseDto> {
    const requestId = randomUUID();
    const created = await this.uow.run(async (manager) =>
      this.createPendingRequest(userId, workspaceId, dto, requestId, manager),
    );

    let payloadVersionId: string | null = null;

    try {
      const uploadResult = await this.dispatchService.uploadPayload({
        objectName: created.request.payloadObjectName,
        payload: created.payload,
      });
      payloadVersionId = uploadResult.payloadVersionId;

      const event = this.dispatchService.buildRequestedEvent({
        requestId: created.request.requestId,
        payloadObjectName: created.request.payloadObjectName,
        payloadVersionId,
        workspaceId: created.request.workspaceId,
        projectId: created.request.projectId,
        requestedByUserId: userId,
        requestedAt: created.payload.requestedAt,
      });
      const publishResult =
        await this.dispatchService.publishRequestedEvent(event);

      const queuedRequest =
        await this.repo.markFeatureProvisioningRequestQueued({
          workspaceId: created.request.workspaceId,
          requestId: created.request.requestId,
          payloadVersionId,
          queueMessageId: publishResult.queueMessageId,
        });
      if (!queuedRequest) {
        throw new FeatureProvisioningRequestNotFoundError();
      }

      return queuedRequest;
    } catch (error) {
      await this.repo.markFeatureProvisioningRequestDispatchFailed({
        workspaceId: created.request.workspaceId,
        requestId: created.request.requestId,
        payloadVersionId,
        errorMessage: this.toDispatchErrorMessage(error),
      });

      throw error;
    }
  }

  async getFeatureProvisioningRequest(
    userId: string,
    workspaceId: string,
    requestId: string,
  ): Promise<FeatureProvisioningRequestResponseDto> {
    const request =
      await this.repo.findFeatureProvisioningRequestByIdAndMemberUserId(
        workspaceId,
        requestId,
        userId,
      );
    if (!request) {
      throw new FeatureProvisioningRequestNotFoundError();
    }

    return request;
  }

  private async createPendingRequest(
    userId: string,
    workspaceId: string,
    dto: CreateFeatureProvisioningRequestDto,
    requestId: string,
    manager: EntityManager,
  ): Promise<{
    request: FeatureProvisioningRequestRow;
    payload: FeatureProvisioningPayload;
  }> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
      manager,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    const project = await this.repo.findProjectByWorkspaceId(
      workspace.workspaceId,
      dto.projectId,
      manager,
    );
    if (!project) {
      throw new FeatureProvisioningProjectNotFoundError();
    }

    const members = await this.repo.findWorkspaceMembersByWorkspaceId(
      workspace.workspaceId,
      manager,
    );
    const payloadObjectName = this.dispatchService.buildPayloadObjectName(
      workspace.workspaceId,
      requestId,
    );
    const request = await this.repo.createFeatureProvisioningRequest(
      {
        requestId,
        workspaceId: workspace.workspaceId,
        projectId: project.projectId,
        requestedByUserId: userId,
        status: 'pending',
        payloadObjectName,
      },
      manager,
    );

    return {
      request,
      payload: this.buildPayload({
        request,
        workspace,
        project,
        members,
        featureSpecification: dto.featureSpecification,
      }),
    };
  }

  private buildPayload(params: {
    request: FeatureProvisioningRequestRow;
    workspace: WorkspaceRow;
    project: WorkspaceProjectSummaryRow;
    members: WorkspaceMemberRow[];
    featureSpecification: string;
  }): FeatureProvisioningPayload {
    return {
      schemaVersion: '1.0',
      requestId: params.request.requestId,
      workspaceId: params.request.workspaceId,
      projectId: params.request.projectId,
      requestedByUserId: params.request.requestedByUserId as string,
      requestedAt: params.request.createdAt.toISOString(),
      featureSpecification: params.featureSpecification,
      workspace: {
        workspaceId: params.workspace.workspaceId,
        name: params.workspace.name,
        slug: params.workspace.slug,
        description: params.workspace.description,
      },
      project: params.project,
      members: params.members,
    };
  }

  private toDispatchErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, DISPATCH_ERROR_MESSAGE_MAX_LENGTH);
    }

    return 'Feature provisioning dispatch failed.';
  }
}
