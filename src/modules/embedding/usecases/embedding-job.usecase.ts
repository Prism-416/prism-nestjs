import { Injectable } from '@nestjs/common';
import {
  ClaimEmbeddingJobsDto,
  ClaimEmbeddingJobsResponseDto,
  CreateEmbeddingJobDto,
  EmbeddingJobResponseDto,
  UpdateEmbeddingJobDto,
} from '@/modules/embedding/dto';
import {
  EmbeddingJobNotFoundError,
  EmbeddingJobProjectNotAllowedError,
  EmbeddingJobProjectRequiredError,
  EmbeddingJobRequeueScheduledAtRequiredError,
  EmbeddingJobTargetNotFoundError,
  EmbeddingProjectNotFoundError,
  EmbeddingWorkspaceNotFoundError,
} from '@/modules/embedding/errors';
import { EmbeddingJobRepository } from '@/modules/embedding/repository';
import {
  EMBEDDING_JOB_DIMENSIONS,
  EmbeddingJobType,
  EmbeddingWorkspaceRow,
} from '@/modules/embedding/types';

@Injectable()
export class EmbeddingJobUseCase {
  constructor(private readonly repo: EmbeddingJobRepository) {}

  async createEmbeddingJob(
    userId: string,
    workspaceId: string,
    dto: CreateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);
    const projectId = await this.resolveProjectScope(
      workspace.workspaceId,
      dto.jobType,
      dto.projectId,
    );

    const targetExists = await this.repo.existsEmbeddingTarget(
      workspace.workspaceId,
      projectId ?? null,
      dto.jobType,
      dto.targetId,
    );
    if (!targetExists) {
      throw new EmbeddingJobTargetNotFoundError();
    }

    return this.repo.createEmbeddingJob({
      workspaceId: workspace.workspaceId,
      projectId,
      jobType: dto.jobType,
      targetId: dto.targetId,
      model: dto.model,
      dimensions: dto.dimensions ?? EMBEDDING_JOB_DIMENSIONS,
      contentHash: dto.contentHash,
      objectName: dto.objectName,
      maxAttempts: dto.maxAttempts ?? 3,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });
  }

  async claimEmbeddingJobs(
    userId: string,
    workspaceId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    return this.claimWorkspaceEmbeddingJobs(workspace.workspaceId, dto);
  }

  async claimEmbeddingJobsForInternal(
    workspaceId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    const workspace = await this.getWorkspace(workspaceId);

    return this.claimWorkspaceEmbeddingJobs(workspace.workspaceId, dto);
  }

  async updateEmbeddingJob(
    userId: string,
    workspaceId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    return this.updateWorkspaceEmbeddingJob(
      workspace.workspaceId,
      embeddingJobId,
      dto,
    );
  }

  async updateEmbeddingJobForInternal(
    workspaceId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const workspace = await this.getWorkspace(workspaceId);

    return this.updateWorkspaceEmbeddingJob(
      workspace.workspaceId,
      embeddingJobId,
      dto,
    );
  }

  private async claimWorkspaceEmbeddingJobs(
    workspaceId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    if (dto.projectId !== undefined) {
      await this.ensureProjectInWorkspace(workspaceId, dto.projectId);
    }

    const items = await this.repo.claimEmbeddingJobs({
      workspaceId,
      projectId: dto.projectId,
      jobTypes: dto.jobTypes,
      model: dto.model,
      limit: dto.limit ?? 10,
    });

    return {
      items,
      count: items.length,
    };
  }

  private async updateWorkspaceEmbeddingJob(
    workspaceId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    if (dto.status === 'queued' && dto.scheduledAt === undefined) {
      throw new EmbeddingJobRequeueScheduledAtRequiredError();
    }

    const job = await this.repo.updateEmbeddingJob({
      workspaceId,
      embeddingJobId,
      status: dto.status,
      errorMessage: dto.errorMessage,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
    if (!job) {
      throw new EmbeddingJobNotFoundError();
    }

    return job;
  }

  private async resolveProjectScope(
    workspaceId: string,
    jobType: EmbeddingJobType,
    projectId?: string,
  ): Promise<string | undefined> {
    if (jobType === 'agent_memory') {
      if (projectId !== undefined) {
        throw new EmbeddingJobProjectNotAllowedError();
      }

      return undefined;
    }

    if (projectId === undefined) {
      throw new EmbeddingJobProjectRequiredError();
    }

    await this.ensureProjectInWorkspace(workspaceId, projectId);
    return projectId;
  }

  private async ensureProjectInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.repo.findProjectByWorkspaceIdAndId(
      workspaceId,
      projectId,
    );
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }
  }

  private async getWorkspaceForUser(
    userId: string,
    workspaceId: string,
  ): Promise<EmbeddingWorkspaceRow> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new EmbeddingWorkspaceNotFoundError();
    }

    return workspace;
  }

  private async getWorkspace(
    workspaceId: string,
  ): Promise<EmbeddingWorkspaceRow> {
    const workspace = await this.repo.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new EmbeddingWorkspaceNotFoundError();
    }

    return workspace;
  }
}
