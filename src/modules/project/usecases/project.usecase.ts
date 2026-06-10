import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateProjectDto,
  GetProjectsQueryDto,
  ProjectRepositoryLinkResponseDto,
  ProjectResponseDto,
  ProjectSummaryResponseDto,
  UpdateProjectDto,
  UpsertProjectRepositoryLinkDto,
} from '@/modules/project/dto';
import {
  isProjectRepositoryLinkUniqueViolation,
  isProjectSlugUniqueViolation,
  ProjectNotFoundError,
  ProjectRepositoryLinkAlreadyAssignedError,
  ProjectRepositoryLinkNotFoundError,
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

  async getProjectRepositoryLink(
    userId: string,
    projectId: string,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const link = await this.repo.findGithubRepositoryLinkByProjectId(projectId);
    if (!link) {
      throw new ProjectRepositoryLinkNotFoundError();
    }

    return link;
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

  async upsertProjectRepositoryLink(
    userId: string,
    projectId: string,
    dto: UpsertProjectRepositoryLinkDto,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    const project = await this.repo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    let link: ProjectRepositoryLinkResponseDto | null;

    try {
      link = await this.repo.upsertGithubRepositoryLink({
        projectId,
        workspaceRepositoryLinkId: dto.workspaceRepositoryLinkId,
        connectedByUserId: userId,
      });
    } catch (error) {
      if (isProjectRepositoryLinkUniqueViolation(error)) {
        throw new ProjectRepositoryLinkAlreadyAssignedError();
      }

      throw error;
    }
    if (!link) {
      throw new ProjectRepositoryLinkNotFoundError();
    }

    return link;
  }

  async deleteProjectRepositoryLink(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.repo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const deleted = await this.repo.deleteGithubRepositoryLink(projectId);
    if (!deleted) {
      throw new ProjectRepositoryLinkNotFoundError();
    }
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
