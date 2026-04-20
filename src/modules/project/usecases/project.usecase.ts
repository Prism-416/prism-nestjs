import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateProjectDto,
  GetProjectsQueryDto,
  ProjectMemberListResponseDto,
  ProjectMemberResponseDto,
  ProjectResponseDto,
  ProjectSummaryResponseDto,
  UpdateProjectDto,
  UpsertProjectMembersDto,
} from '@/modules/project/dto';
import {
  ProjectJobNotFoundError,
  ProjectMemberNotFoundError,
  isProjectSlugUniqueViolation,
  ProjectMemberWorkspaceMemberNotFoundError,
  ProjectNotFoundError,
  ProjectSlugAlreadyExistsError,
} from '@/modules/project/errors';
import { ProjectRepository } from '@/modules/project/repository';
import { generateProjectSlug } from '@/modules/project/utils';
import { WorkspaceNotFoundError } from '@/modules/workspace/errors';

@Injectable()
export class ProjectUseCase {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly uow: UnitOfWork,
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

  async getProjectMembers(
    userId: string,
    projectId: string,
  ): Promise<ProjectMemberListResponseDto[]> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.repo.findProjectMembersByProjectId(projectId);
  }

  async createProject(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.uow.run(async (manager) => {
      let project: ProjectResponseDto | null;

      try {
        project = await this.repo.createProject(
          {
            workspaceId: dto.workspaceId,
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

      await this.repo.createProjectMember(
        {
          workspaceId: project.workspaceId,
          projectId: project.projectId,
          userId,
        },
        manager,
      );

      return project;
    });
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

    return this.repo.updateProject({
      projectId,
      name: dto.name ?? project.name,
      description: dto.description ?? project.description,
      timezone: dto.timezone ?? project.timezone,
      locale: dto.locale ?? project.locale,
    });
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const deleted = await this.repo.deleteProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!deleted) {
      throw new ProjectNotFoundError();
    }
  }

  async removeProjectMember(
    userId: string,
    projectId: string,
    memberId: string,
  ): Promise<void> {
    const project = await this.repo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const deleted = await this.repo.deleteProjectMemberById(
      project.workspaceId,
      project.projectId,
      memberId,
    );
    if (!deleted) {
      throw new ProjectMemberNotFoundError();
    }
  }

  async upsertProjectMembers(
    userId: string,
    projectId: string,
    dto: UpsertProjectMembersDto,
  ): Promise<ProjectMemberResponseDto[]> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndAdminUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const requestedUserIds = dto.members.map((member) => member.userId);
      const workspaceMembers = await this.repo.findWorkspaceMembersByUserIds(
        project.workspaceId,
        requestedUserIds,
        manager,
      );
      if (workspaceMembers.length !== requestedUserIds.length) {
        throw new ProjectMemberWorkspaceMemberNotFoundError();
      }

      const requestedJobIds = [
        ...new Set(dto.members.flatMap((member) => member.jobIds)),
      ];
      const projectJobs = await this.repo.findProjectJobsByIds(
        project.workspaceId,
        requestedJobIds,
        manager,
      );
      if (projectJobs.length !== requestedJobIds.length) {
        throw new ProjectJobNotFoundError();
      }

      const projectMembers = await this.repo.upsertProjectMembers(
        {
          workspaceId: project.workspaceId,
          projectId: project.projectId,
          userIds: requestedUserIds,
        },
        manager,
      );
      const memberByUserId = new Map(
        projectMembers.map((member) => [member.userId, member]),
      );

      await this.repo.replaceProjectMemberJobs(
        {
          members: dto.members.map((member) => ({
            memberId: memberByUserId.get(member.userId)!.memberId,
            jobIds: member.jobIds,
          })),
        },
        manager,
      );

      return dto.members.map((member) => {
        const projectMember = memberByUserId.get(member.userId)!;
        return {
          memberId: projectMember.memberId,
          workspaceId: projectMember.workspaceId,
          projectId: projectMember.projectId,
          userId: projectMember.userId,
          jobIds: member.jobIds,
          assignedAt: projectMember.assignedAt,
        };
      });
    });
  }
}
