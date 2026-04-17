import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import { CreateProjectDto, ProjectResponseDto } from '@/modules/project/dto';
import {
  isProjectSlugUniqueViolation,
  ProjectSlugAlreadyExistsError,
} from '@/modules/project/errors';
import { ProjectRepository } from '@/modules/project/repository';
import { generateProjectSlug } from '@/modules/project/utils';
import { WorkspaceNotFoundError } from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';

@Injectable()
export class ProjectUseCase {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createProject(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace =
        await this.workspaceRepo.findWorkspaceByIdAndAdminUserId(
          dto.workspaceId,
          userId,
        );
      if (!workspace) {
        throw new WorkspaceNotFoundError();
      }

      try {
        const project = await this.projectRepo.createProject(
          {
            workspaceId: workspace.workspaceId,
            name: dto.name,
            slug: generateProjectSlug(dto.name),
            description: dto.description,
          },
          manager,
        );

        await this.projectRepo.createProjectMember(
          {
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            userId,
          },
          manager,
        );

        return project;
      } catch (error) {
        if (isProjectSlugUniqueViolation(error)) {
          throw new ProjectSlugAlreadyExistsError();
        }

        throw error;
      }
    });
  }
}
