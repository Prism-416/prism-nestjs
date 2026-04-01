import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/common/database';
import {
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  UpdateWorkspaceDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS } from '@/modules/workspace/constants';
import {
  isWorkspaceSlugUniqueViolation,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberUserNotFoundError,
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceInvitationNotifierService } from '@/modules/workspace/services';
import {
  WorkspaceInvitationRow,
  WorkspaceRow,
} from '@/modules/workspace/types';
import { generateWorkspaceSlug } from '@/modules/workspace/utils';

@Injectable()
export class WorkspaceUseCase {
  private readonly invitationPageUrl: string;

  constructor(
    private readonly repo: WorkspaceRepository,
    private readonly uow: UnitOfWork,
    private readonly invitationNotifier: WorkspaceInvitationNotifierService,
    private readonly configService: ConfigService,
  ) {
    this.invitationPageUrl = this.configService.get<string>(
      'WORKSPACE_INVITATION_PAGE_URL',
      '',
    );
  }

  async getWorkspaces(userId: string): Promise<WorkspaceResponseDto[]> {
    return this.repo.findWorkspacesByMemberUserId(userId);
  }

  async getWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }
    return workspace;
  }

  async getWorkspaceMembers(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.findWorkspaceMembersByWorkspaceId(workspaceId);
  }

  async createWorkspaceInvitation(
    userId: string,
    workspaceId: string,
    dto: CreateWorkspaceInvitationDto,
  ): Promise<WorkspaceInvitationResponseDto> {
    const { invitationResponse, receiver, workspaceName } = await this.uow.run(
      async (manager) => {
        const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
          workspaceId,
          userId,
        );
        if (!workspace) {
          throw new WorkspaceNotFoundError();
        }

        const receiver = await this.repo.findUserById(dto.receiverId, manager);
        if (!receiver) {
          throw new WorkspaceMemberUserNotFoundError();
        }

        const existingMember = await this.repo.findWorkspaceMember(
          workspaceId,
          dto.receiverId,
          manager,
        );
        if (existingMember) {
          throw new WorkspaceMemberAlreadyExistsError();
        }

        const token = randomUUID();
        const expiresAt = new Date(
          Date.now() +
            this.configService.get<number>(
              'WORKSPACE_INVITATION_EXPIRES_IN_SEC',
              86400,
            ) *
              1000,
        );

        const invitation: WorkspaceInvitationRow =
          await this.repo.createWorkspaceInvitation(
            {
              workspaceId,
              senderId: userId,
              receiverId: dto.receiverId,
              role: dto.role,
              token,
              expiresAt,
            },
            manager,
          );

        await this.repo.createWorkspaceInvitationEvent(
          {
            invitationId: invitation.invitationId,
            actorId: userId,
            eventType: 'sent',
          },
          manager,
        );

        return {
          workspaceName: workspace.name,
          receiver,
          invitationResponse: {
            invitationId: invitation.invitationId,
            workspaceId: invitation.workspaceId,
            senderId: invitation.senderId,
            receiverId: invitation.receiverId,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            token: invitation.token,
            invitationLink: this.buildInvitationLink(invitation.token),
          },
        };
      },
    );

    await this.invitationNotifier.sendWorkspaceInvitation(
      workspaceName,
      invitationResponse,
      receiver,
    );

    return invitationResponse;
  }

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.createWorkspaceWithGeneratedSlug(
        {
          ownerId: userId,
          name: dto.name,
          description: dto.description,
        },
        manager,
      );

      await this.repo.createOwnerMembership(
        workspace.workspaceId,
        userId,
        manager,
      );
      return workspace;
    });
  }

  async updateWorkspace(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.updateWorkspace({
      workspaceId,
      name: dto.name ?? workspace.name,
      description: dto.description ?? workspace.description,
    });
  }

  private async createWorkspaceWithGeneratedSlug(
    params: {
      ownerId: string;
      name: string;
      description?: string;
    },
    manager: EntityManager,
  ): Promise<WorkspaceRow> {
    for (
      let attempt = 0;
      attempt < MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const slug = generateWorkspaceSlug(params.name);

      try {
        return await this.repo.createWorkspace(
          {
            ownerId: params.ownerId,
            name: params.name,
            slug,
            description: params.description,
          },
          manager,
        );
      } catch (error) {
        if (isWorkspaceSlugUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new WorkspaceSlugAlreadyExistsError();
  }

  private buildInvitationLink(token: string): string {
    if (!this.invitationPageUrl) {
      return token;
    }
    return `${this.invitationPageUrl}?token=${encodeURIComponent(token)}`;
  }
}
