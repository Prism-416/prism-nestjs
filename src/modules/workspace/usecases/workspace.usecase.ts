import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/common/database';
import {
  CreateWorkspaceDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceSlugService } from '@/modules/workspace/services';

@Injectable()
export class WorkspaceUseCase {
  constructor(
    private readonly repo: WorkspaceRepository,
    private readonly uow: UnitOfWork,
    private readonly workspaceSlugService: WorkspaceSlugService,
  ) {}

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace =
        await this.workspaceSlugService.createWorkspaceWithGeneratedSlug(
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
}
