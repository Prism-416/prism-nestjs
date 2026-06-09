import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateProjectDto,
  GetProjectsQueryDto,
  ProjectResponseDto,
  ProjectSummaryResponseDto,
  UpdateProjectDto,
} from '@/modules/project/dto';
import {
  isProjectSlugUniqueViolation,
  ProjectNotFoundError,
  ProjectSlugAlreadyExistsError,
} from '@/modules/project/errors';
import { ProjectRepository } from '@/modules/project/repository';
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import { generateProjectSlug } from '@/modules/project/utils';
import { WorkspaceNotFoundError } from '@/modules/workspace/errors';
import { WorkspaceRealtimePublisherService } from '@/modules/workspace/services';

@Injectable()
export class ProjectUseCase {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly uow: UnitOfWork,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
    private readonly workspaceRealtimePublisher: WorkspaceRealtimePublisherService,
  ) {}

  async getProjects(
    userId: string,
    query: GetProjectsQueryDto,
  ): Promise<ProjectSummaryResponseDto[]> {
    const hasWorkspaceAccess =
      await this.repo.existsWorkspaceByIdAndMemberUserId(
        query.workspaceId,
        userId,
      );
    if (!hasWorkspaceAccess) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.findProjectsByMemberUserId(userId, query.workspaceId);
  }

  async getProjectsWithWorkspaceSlug(
    userId: string,
    workspaceSlug: string,
  ): Promise<ProjectSummaryResponseDto[]> {
    const hasWorkspaceAccess =
      await this.repo.existsWorkspaceBySlugAndMemberUserId(
        workspaceSlug,
        userId,
      );
    if (!hasWorkspaceAccess) {
      throw new WorkspaceNotFoundError();
    }

    return this.repo.findProjectsByWorkspaceSlugAndMemberUserId(
      userId,
      workspaceSlug,
    );
  }

  async getProjectBySlug(
    userId: string,
    projectSlug: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.repo.findProjectBySlugAndMemberUserId(
      userId,
      projectSlug,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return project;
  }

  async getProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return project;
  }

  async createProject(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.uow.run(async (manager) => {
      let project: ProjectResponseDto | null;

      try {
        project = await this.repo.createProject(
          {
            workspaceSlug: dto.workspaceSlug,
            adminUserId: userId,
            name: dto.name,
            slug: generateProjectSlug(dto.name),
            description: dto.description,
          },
          manager,
        );
      } catch (error) {
        if (isProjectSlugUniqueViolation(error)) {
          throw new ProjectSlugAlreadyExistsError();
        }

        throw error;
      }

      if (!project) {
        throw new WorkspaceNotFoundError();
      }

      return project;
    });

    this.workspaceRealtimePublisher.publishProjectCreated(project);

    return project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.repo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const updatedProject = await this.repo.updateProject({
      projectId,
      name: dto.name ?? project.name,
      description: dto.description ?? project.description,
    });

    this.realtimePublisher.publishProjectUpdated(updatedProject);
    this.workspaceRealtimePublisher.publishProjectUpdated(updatedProject);

    return updatedProject;
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.repo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const deleted = await this.repo.deleteProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!deleted) {
      throw new ProjectNotFoundError();
    }

    this.realtimePublisher.publishProjectDeleted({ projectId });
    this.workspaceRealtimePublisher.publishProjectDeleted({
      workspaceId: project.workspaceId,
      projectId,
    });
  }
}
