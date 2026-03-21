import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/common/database';
import {
  CreateWorkspaceDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import {
  isWorkspaceSlugUniqueViolation,
  WorkspaceSlugAlreadyExistsError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceRow } from '@/modules/workspace/types';

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
      const existingWorkspace = await this.repo.findWorkspaceBySlug(
        dto.slug,
        manager,
      );
      if (existingWorkspace) {
        throw new WorkspaceSlugAlreadyExistsError();
      }

      let workspace: WorkspaceRow;
      try {
        workspace = await this.repo.createWorkspace(
          {
            ownerId: userId,
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
          },
          manager,
        );
      } catch (error) {
        if (isWorkspaceSlugUniqueViolation(error)) {
          throw new WorkspaceSlugAlreadyExistsError();
        }
        throw error;
      }

      await this.repo.createOwnerMembership(
        workspace.workspaceId,
        userId,
        manager,
      );
      return workspace;
    });
  }
}
