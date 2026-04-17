import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UnitOfWork } from '@/core/database';
import {
  AcceptWorkspaceInvitationDto,
  CreateProjectRolesDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  ProjectRoleResponseDto,
  UpdateWorkspaceDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import {
  isProjectRoleNameUniqueViolation,
  ProjectRoleAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberUserNotFoundError,
  WorkspaceInvitationExpiredError,
  WorkspaceInvitationNotFoundError,
  WorkspaceNotFoundError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import {
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import { WorkspaceInvitationRow } from '@/modules/workspace/types';

@Injectable()
export class WorkspaceUseCase {
  private readonly invitationPageUrl: string;

  constructor(
    private readonly repo: WorkspaceRepository,
    private readonly uow: UnitOfWork,
    private readonly invitationNotifier: WorkspaceInvitationNotifierService,
    private readonly workspaceProvisioning: WorkspaceProvisioningService,
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

  async createProjectRoles(
    userId: string,
    workspaceId: string,
    dto: CreateProjectRolesDto,
  ): Promise<ProjectRoleResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.uow.run(async (manager) => {
      try {
        return await this.repo.createProjectRoles(
          {
            workspaceId: workspace.workspaceId,
            roles: dto.roles.map((role) => ({
              name: role.name,
              description: role.description,
            })),
          },
          manager,
        );
      } catch (error) {
        if (isProjectRoleNameUniqueViolation(error)) {
          throw new ProjectRoleAlreadyExistsError();
        }

        throw error;
      }
    });
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

  async acceptWorkspaceInvitation(
    dto: AcceptWorkspaceInvitationDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const invitation = await this.repo.findWorkspaceInvitationByToken(
        dto.token,
        manager,
      );
      if (!invitation) {
        throw new WorkspaceInvitationNotFoundError();
      }

      const workspace = await this.repo.findWorkspaceById(
        invitation.workspaceId,
        manager,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      const existingMember = await this.repo.findWorkspaceMember(
        invitation.workspaceId,
        invitation.receiverId,
        manager,
      );
      if (existingMember) {
        throw new WorkspaceMemberAlreadyExistsError();
      }

      if (invitation.expiresAt.getTime() < Date.now()) {
        throw new WorkspaceInvitationExpiredError();
      }

      await this.repo.createWorkspaceMembership(
        {
          workspaceId: invitation.workspaceId,
          userId: invitation.receiverId,
          role: invitation.role,
          invitedAt: invitation.createdAt,
        },
        manager,
      );

      await this.repo.createWorkspaceInvitationEvent(
        {
          invitationId: invitation.invitationId,
          actorId: invitation.receiverId,
          eventType: 'accepted',
        },
        manager,
      );

      return workspace;
    });
  }

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      return this.workspaceProvisioning.createOwnedWorkspace(
        {
          ownerId: userId,
          name: dto.name,
          description: dto.description,
        },
        manager,
      );
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

  private buildInvitationLink(token: string): string {
    if (!this.invitationPageUrl) {
      return token;
    }
    return `${this.invitationPageUrl}?token=${encodeURIComponent(token)}`;
  }
}
