import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { isEmail } from 'class-validator';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import { ProjectSummaryResponseDto } from '@/modules/project/dto';
import {
  AcceptWorkspaceInvitationDto,
  CreateWorkspaceJobsDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  DeclineWorkspaceInvitationDto,
  GetWorkspaceInvitationQueryDto,
  WorkspaceJobResponseDto,
  SearchWorkspaceMemberCandidatesQueryDto,
  TransferWorkspaceOwnerDto,
  UpdateWorkspaceMemberJobsDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateWorkspaceJobsDto,
  UpdateWorkspaceDto,
  WorkspaceMemberCandidateSearchResponseDto,
  WorkspaceMemberCandidateResponseDto,
  WorkspaceInvitationPreviewResponseDto,
  WorkspaceSummaryResponseDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import {
  isWorkspaceJobNameUniqueViolation,
  WorkspaceJobAlreadyExistsError,
  WorkspaceJobNotFoundError,
  WorkspaceNameAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberUserNotFoundError,
  WorkspaceInvitationAlreadyAcceptedError,
  WorkspaceInvitationAlreadyDeclinedError,
  WorkspaceInvitationCancelledError,
  WorkspaceInvitationExpiredError,
  WorkspaceInvitationNotFoundError,
  WorkspaceInvitationRecipientRequiredError,
  WorkspaceInvitationSignupRequiredError,
  WorkspaceNotFoundError,
  WorkspaceOwnerRemovalError,
  WorkspaceOwnerRequiredError,
  WorkspaceOwnerRoleUpdateError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import {
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import { WorkspaceInvitationStatus } from '@/modules/workspace/constants';
import {
  WorkspaceInvitationRow,
  WorkspaceInvitationEventRow,
  WorkspaceInvitationReceiver,
  WorkspaceMemberCandidateKind,
  WorkspaceMemberCandidateSearchReason,
  WorkspaceRow,
  WorkspaceUserRow,
} from '@/modules/workspace/types';

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
      'EMAIL_WORKSPACE_INVITATION_PAGE_URL',
      '',
    );
  }

  async getWorkspaces(userId: string): Promise<WorkspaceSummaryResponseDto[]> {
    return this.repo.findWorkspacesByMemberUserId(userId);
  }

  async searchWorkspaceMemberCandidates(
    userId: string,
    query: SearchWorkspaceMemberCandidatesQueryDto,
  ): Promise<WorkspaceMemberCandidateSearchResponseDto> {
    if (query.workspaceId) {
      const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
        query.workspaceId,
        userId,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }
    }

    if (this.isExactEmail(query.keyword)) {
      const existingUser = await this.repo.findUserByEmail(query.keyword);
      if (existingUser) {
        if (existingUser.userId === userId) {
          return this.toWorkspaceMemberCandidateSearchResult('self');
        }

        if (query.workspaceId) {
          const existingMember = await this.repo.findWorkspaceMember(
            query.workspaceId,
            existingUser.userId,
          );
          if (existingMember) {
            return this.toWorkspaceMemberCandidateSearchResult(
              'already_member',
            );
          }
        }

        return this.toWorkspaceMemberCandidateSearchResult('success', [
          this.toWorkspaceMemberCandidate('existing', existingUser),
        ]);
      }

      return this.toWorkspaceMemberCandidateSearchResult('success', [
        {
          kind: 'external',
          userId: null,
          email: query.keyword,
          fullName: null,
          username: null,
        },
      ]);
    }

    if (query.keyword.length < 2) {
      return this.toWorkspaceMemberCandidateSearchResult('success');
    }

    const users = await this.repo.searchWorkspaceMemberCandidates(
      query.keyword,
      userId,
      query.workspaceId,
    );

    if (users.length === 0) {
      return this.toWorkspaceMemberCandidateSearchResult('no_results');
    }

    return this.toWorkspaceMemberCandidateSearchResult(
      'success',
      users.map((user) => this.toWorkspaceMemberCandidate('existing', user)),
    );
  }

  async getWorkspaceInvitation(
    query: GetWorkspaceInvitationQueryDto,
  ): Promise<WorkspaceInvitationPreviewResponseDto> {
    const invitationContext = await this.getWorkspaceInvitationContext(
      query.token,
    );

    return this.toWorkspaceInvitationPreview(invitationContext);
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

  async getWorkspaceProjectsBySlug(
    userId: string,
    workspaceSlug: string,
  ): Promise<ProjectSummaryResponseDto[]> {
    const workspace = await this.repo.findWorkspaceBySlugAndMemberUserId(
      workspaceSlug,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.findProjectsByWorkspaceSlugAndMemberUserId(
      userId,
      workspaceSlug,
    );
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

  async removeWorkspaceMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.uow.run(async (manager) => {
      const isLeavingSelf = userId === targetUserId;
      const workspace = isLeavingSelf
        ? await this.repo.findWorkspaceByIdAndMemberUserId(
            workspaceId,
            userId,
            manager,
          )
        : await this.repo.findWorkspaceByIdAndAdminUserId(
            workspaceId,
            userId,
            manager,
          );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      const member = await this.repo.findWorkspaceMember(
        workspace.workspaceId,
        targetUserId,
        manager,
      );
      if (!member) {
        throw new WorkspaceMemberNotFoundError();
      }

      if (workspace.ownerId === member.userId) {
        throw new WorkspaceOwnerRemovalError();
      }

      const deleted = await this.repo.deleteWorkspaceMemberByUserId(
        workspace.workspaceId,
        member.userId,
        manager,
      );
      if (!deleted) {
        throw new WorkspaceMemberNotFoundError();
      }
    });
  }

  async updateWorkspaceMemberRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateWorkspaceMemberRoleDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      const member = await this.repo.findWorkspaceMember(
        workspace.workspaceId,
        targetUserId,
        manager,
      );
      if (!member) {
        throw new WorkspaceMemberNotFoundError();
      }

      if (workspace.ownerId === member.userId) {
        throw new WorkspaceOwnerRoleUpdateError();
      }

      return this.repo.updateWorkspaceMemberRole(
        workspace.workspaceId,
        member.userId,
        dto.role,
        manager,
      );
    });
  }

  async updateWorkspaceMemberJobs(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateWorkspaceMemberJobsDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      const member = await this.repo.findWorkspaceMember(
        workspace.workspaceId,
        targetUserId,
        manager,
      );
      if (!member) {
        throw new WorkspaceMemberNotFoundError();
      }

      const workspaceJobs = await this.repo.findWorkspaceJobIds(
        workspace.workspaceId,
        dto.jobIds,
        manager,
      );
      if (workspaceJobs.length !== dto.jobIds.length) {
        throw new WorkspaceJobNotFoundError();
      }

      await this.repo.replaceWorkspaceMemberJobs(
        workspace.workspaceId,
        member.userId,
        dto.jobIds,
        manager,
      );

      const updatedMember = await this.repo.findWorkspaceMember(
        workspace.workspaceId,
        member.userId,
        manager,
      );
      if (!updatedMember) {
        throw new WorkspaceMemberNotFoundError();
      }

      return updatedMember;
    });
  }

  async transferWorkspaceOwner(
    userId: string,
    workspaceId: string,
    dto: TransferWorkspaceOwnerDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceById(workspaceId, manager);
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      if (workspace.ownerId !== userId) {
        throw new WorkspaceOwnerRequiredError();
      }

      const member = await this.repo.findWorkspaceMember(
        workspace.workspaceId,
        dto.ownerId,
        manager,
      );
      if (!member) {
        throw new WorkspaceMemberNotFoundError();
      }

      await this.repo.updateWorkspaceMemberRole(
        workspace.workspaceId,
        workspace.ownerId,
        'admin',
        manager,
      );

      await this.repo.updateWorkspaceMemberRole(
        workspace.workspaceId,
        member.userId,
        'owner',
        manager,
      );

      return this.repo.updateWorkspaceOwner(
        workspace.workspaceId,
        member.userId,
        manager,
      );
    });
  }

  async getWorkspaceJobs(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceJobResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.findWorkspaceJobsByWorkspaceId(workspaceId);
  }

  async createWorkspaceJobs(
    userId: string,
    workspaceId: string,
    dto: CreateWorkspaceJobsDto,
  ): Promise<WorkspaceJobResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.uow.run(async (manager) => {
      try {
        return await this.repo.createWorkspaceJobs(
          {
            workspaceId: workspace.workspaceId,
            jobs: dto.jobs.map((job) => ({
              name: job.name,
              description: job.description ?? null,
            })),
          },
          manager,
        );
      } catch (error) {
        if (isWorkspaceJobNameUniqueViolation(error)) {
          throw new WorkspaceJobAlreadyExistsError();
        }

        throw error;
      }
    });
  }

  async updateWorkspaceJobs(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceJobsDto,
  ): Promise<WorkspaceJobResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.uow.run(async (manager) => {
      const updatedJobs: WorkspaceJobResponseDto[] = [];

      for (const job of dto.jobs) {
        let updatedJob: WorkspaceJobResponseDto | null;

        try {
          updatedJob = await this.repo.updateWorkspaceJob(
            {
              workspaceId: workspace.workspaceId,
              jobId: job.jobId,
              name: job.name,
              description: job.description ?? null,
            },
            manager,
          );
        } catch (error) {
          if (isWorkspaceJobNameUniqueViolation(error)) {
            throw new WorkspaceJobAlreadyExistsError();
          }

          throw error;
        }

        if (!updatedJob) {
          throw new WorkspaceJobNotFoundError();
        }

        updatedJobs.push(updatedJob);
      }

      return updatedJobs;
    });
  }

  async deleteWorkspaceJob(
    userId: string,
    workspaceId: string,
    jobId: string,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      const deleted = await this.repo.deleteWorkspaceJob(
        workspace.workspaceId,
        jobId,
        manager,
      );
      if (!deleted) {
        throw new WorkspaceJobNotFoundError();
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

        const receiver = await this.resolveWorkspaceInvitationCreateReceiver(
          dto,
          manager,
        );

        if (receiver.userId) {
          const existingMember = await this.repo.findWorkspaceMember(
            workspaceId,
            receiver.userId,
            manager,
          );
          if (existingMember) {
            throw new WorkspaceMemberAlreadyExistsError();
          }
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
              receiverId: receiver.userId,
              receiverEmail: receiver.email,
              role: dto.role,
              token,
              expiresAt,
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
            receiverEmail: invitation.receiverEmail,
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

    await this.repo.createWorkspaceInvitationEvent({
      invitationId: invitationResponse.invitationId,
      actorId: userId,
      eventType: 'sent',
    });

    return invitationResponse;
  }

  async acceptWorkspaceInvitation(
    dto: AcceptWorkspaceInvitationDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const invitationContext = await this.getWorkspaceInvitationContext(
        dto.token,
        manager,
      );
      const { invitation, workspace, status } = invitationContext;

      this.ensurePendingWorkspaceInvitation(status);

      const receiver = await this.resolveWorkspaceInvitationReceiver(
        invitation,
        manager,
      );

      const existingMember = await this.repo.findWorkspaceMember(
        invitation.workspaceId,
        receiver.userId,
        manager,
      );
      if (existingMember) {
        throw new WorkspaceMemberAlreadyExistsError();
      }

      await this.repo.createWorkspaceMembership(
        {
          workspaceId: invitation.workspaceId,
          userId: receiver.userId,
          role: invitation.role,
        },
        manager,
      );

      await this.repo.attachWorkspaceInvitationReceiver(
        invitation.invitationId,
        receiver.userId,
        manager,
      );

      await this.repo.createWorkspaceInvitationEvent(
        {
          invitationId: invitation.invitationId,
          actorId: receiver.userId,
          eventType: 'accepted',
        },
        manager,
      );

      return workspace;
    });
  }

  async declineWorkspaceInvitation(
    dto: DeclineWorkspaceInvitationDto,
  ): Promise<void> {
    await this.uow.run(async (manager) => {
      const invitationContext = await this.getWorkspaceInvitationContext(
        dto.token,
        manager,
      );
      const { invitation, status } = invitationContext;

      this.ensurePendingWorkspaceInvitation(status);

      await this.repo.createWorkspaceInvitationEvent(
        {
          invitationId: invitation.invitationId,
          actorId: invitation.receiverId,
          eventType: 'denied',
        },
        manager,
      );
    });
  }

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const existingWorkspace = await this.repo.findWorkspaceByOwnerIdAndName(
        userId,
        dto.name,
        manager,
      );
      if (existingWorkspace) {
        throw new WorkspaceNameAlreadyExistsError();
      }

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
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      if (dto.name !== undefined) {
        const existingWorkspace = await this.repo.findWorkspaceByOwnerIdAndName(
          workspace.ownerId,
          dto.name,
          manager,
          workspace.workspaceId,
        );
        if (existingWorkspace) {
          throw new WorkspaceNameAlreadyExistsError();
        }
      }

      return this.repo.updateWorkspace(
        {
          workspaceId,
          name: dto.name ?? workspace.name,
          description:
            dto.description !== undefined
              ? dto.description
              : workspace.description,
        },
        manager,
      );
    });
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }
    if (workspace.ownerId !== userId) {
      throw new WorkspaceOwnerRequiredError();
    }

    const deleted = await this.repo.markWorkspaceDeletedByIdAndOwnerId(
      workspaceId,
      userId,
    );
    if (!deleted) {
      throw new WorkspaceNotFoundError();
    }
  }

  async restoreWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.repo.restoreWorkspaceByIdAndOwnerId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return workspace;
  }

  private async getWorkspaceInvitationContext(
    token: string,
    manager?: EntityManager,
  ): Promise<{
    invitation: WorkspaceInvitationRow;
    workspace: WorkspaceRow;
    status: WorkspaceInvitationStatus;
    requiresSignup: boolean;
  }> {
    const invitation = await this.repo.findWorkspaceInvitationByToken(
      token,
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

    let resolvedReceiverId = invitation.receiverId;
    if (!resolvedReceiverId) {
      const receiver = await this.repo.findUserByEmail(
        invitation.receiverEmail,
        manager,
      );
      resolvedReceiverId = receiver?.userId ?? null;
    }

    if (resolvedReceiverId) {
      const existingMember = await this.repo.findWorkspaceMember(
        invitation.workspaceId,
        resolvedReceiverId,
        manager,
      );
      if (existingMember) {
        return {
          invitation,
          workspace,
          status: 'accepted',
          requiresSignup: false,
        };
      }
    }

    const latestEvent = await this.repo.findLatestWorkspaceInvitationEvent(
      invitation.invitationId,
      manager,
    );

    return {
      invitation,
      workspace,
      status: this.resolveWorkspaceInvitationStatus(invitation, latestEvent),
      requiresSignup: !resolvedReceiverId,
    };
  }

  private resolveWorkspaceInvitationStatus(
    invitation: WorkspaceInvitationRow,
    latestEvent: Pick<WorkspaceInvitationEventRow, 'eventType'> | null,
  ): WorkspaceInvitationStatus {
    if (latestEvent?.eventType === 'accepted') {
      return 'accepted';
    }

    if (latestEvent?.eventType === 'denied') {
      return 'declined';
    }

    if (latestEvent?.eventType === 'expired') {
      return 'expired';
    }

    if (latestEvent?.eventType === 'cancelled') {
      return 'cancelled';
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      return 'expired';
    }

    return 'pending';
  }

  private ensurePendingWorkspaceInvitation(
    status: WorkspaceInvitationStatus,
  ): void {
    if (status === 'accepted') {
      throw new WorkspaceInvitationAlreadyAcceptedError();
    }

    if (status === 'declined') {
      throw new WorkspaceInvitationAlreadyDeclinedError();
    }

    if (status === 'expired') {
      throw new WorkspaceInvitationExpiredError();
    }

    if (status === 'cancelled') {
      throw new WorkspaceInvitationCancelledError();
    }
  }

  private toWorkspaceInvitationPreview(invitationContext: {
    invitation: WorkspaceInvitationRow;
    workspace: WorkspaceRow;
    status: WorkspaceInvitationStatus;
    requiresSignup: boolean;
  }): WorkspaceInvitationPreviewResponseDto {
    const { invitation, workspace, status, requiresSignup } = invitationContext;

    return {
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      status,
      requiresSignup,
    };
  }

  private async resolveWorkspaceInvitationCreateReceiver(
    dto: CreateWorkspaceInvitationDto,
    manager: EntityManager,
  ): Promise<WorkspaceInvitationReceiver> {
    if (dto.receiverId) {
      const receiver = await this.repo.findUserById(dto.receiverId, manager);
      if (!receiver) {
        throw new WorkspaceMemberUserNotFoundError();
      }

      return receiver;
    }

    if (!dto.email) {
      throw new WorkspaceInvitationRecipientRequiredError();
    }

    const receiver = await this.repo.findUserByEmail(dto.email, manager);
    if (receiver) {
      return receiver;
    }

    return {
      userId: null,
      email: dto.email,
      fullName: null,
      username: null,
    };
  }

  private async resolveWorkspaceInvitationReceiver(
    invitation: WorkspaceInvitationRow,
    manager: EntityManager,
  ): Promise<WorkspaceUserRow> {
    if (invitation.receiverId) {
      const receiver = await this.repo.findUserById(
        invitation.receiverId,
        manager,
      );
      if (!receiver) {
        throw new WorkspaceMemberUserNotFoundError();
      }

      return receiver;
    }

    const receiver = await this.repo.findUserByEmail(
      invitation.receiverEmail,
      manager,
    );
    if (!receiver) {
      throw new WorkspaceInvitationSignupRequiredError();
    }

    return receiver;
  }

  private buildInvitationLink(token: string): string {
    const invitationPageUrl =
      this.invitationPageUrl || '/workspaces/invitations/accept';
    const separator = invitationPageUrl.includes('?') ? '&' : '?';

    return `${invitationPageUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  private isExactEmail(keyword: string): boolean {
    return isEmail(keyword);
  }

  private toWorkspaceMemberCandidate(
    kind: WorkspaceMemberCandidateKind,
    user: WorkspaceUserRow,
  ): WorkspaceMemberCandidateResponseDto {
    return {
      kind,
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
    };
  }

  private toWorkspaceMemberCandidateSearchResult(
    reason: WorkspaceMemberCandidateSearchReason,
    items: WorkspaceMemberCandidateResponseDto[] = [],
  ): WorkspaceMemberCandidateSearchResponseDto {
    return {
      reason,
      items,
    };
  }
}
