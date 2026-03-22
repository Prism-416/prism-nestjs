import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/common/database';
import {
  CreateWorkspaceDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS } from '@/modules/workspace/constants';
import {
  isWorkspaceSlugUniqueViolation,
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
