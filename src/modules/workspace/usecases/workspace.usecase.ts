import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/common/database';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceMemberResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS } from '@/modules/workspace/constants';
import {
  isWorkspaceSlugUniqueViolation,
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceRow } from '@/modules/workspace/types';
import { generateWorkspaceSlug } from '@/modules/workspace/utils';

@Injectable()
export class WorkspaceUseCase {
  constructor(
    private readonly repo: WorkspaceRepository,
    private readonly uow: UnitOfWork,
  ) {}

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
}
