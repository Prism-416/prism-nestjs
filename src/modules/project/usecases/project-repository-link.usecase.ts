import { Injectable } from '@nestjs/common';
import {
  GithubInstallationAuthorizeResponseDto,
  GithubRepositoryOptionResponseDto,
} from '@/modules/github/dto';
import { GithubInstallationNotFoundError } from '@/modules/github/errors';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services';
import {
  CreateProjectRepositoryLinkDto,
  ProjectRepositoryLinkResponseDto,
} from '@/modules/project/dto';
import {
  ProjectNotFoundError,
  ProjectRepositoryLinkNotFoundError,
} from '@/modules/project/errors';
import {
  ProjectRepository,
  ProjectRepositoryLinkRepository,
} from '@/modules/project/repository';

@Injectable()
export class ProjectRepositoryLinkUseCase {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly linkRepo: ProjectRepositoryLinkRepository,
    private readonly github: GithubAppService,
    private readonly githubInstallations: GithubInstallationRepository,
  ) {}

  async createGithubInstallationAuthorization(
    userId: string,
    projectId: string,
  ): Promise<GithubInstallationAuthorizeResponseDto> {
    await this.findAdminProjectOrThrow(userId, projectId);

    return this.github.createInstallationAuthorization({ userId, projectId });
  }

  async listGithubInstallationRepositories(
    userId: string,
    projectId: string,
    githubInstallationId: string,
  ): Promise<GithubRepositoryOptionResponseDto[]> {
    await this.findAdminProjectOrThrow(userId, projectId);
    await this.ensureInstallationGrant(userId, githubInstallationId);

    return this.github.listInstallationRepositories(githubInstallationId);
  }

  async listProjectRepositories(
    userId: string,
    projectId: string,
  ): Promise<ProjectRepositoryLinkResponseDto[]> {
    const project = await this.projectRepo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.linkRepo.findLinksByProjectId(projectId);
  }

  async connectProjectRepository(
    userId: string,
    projectId: string,
    dto: CreateProjectRepositoryLinkDto,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    const project = await this.findAdminProjectOrThrow(userId, projectId);
    await this.ensureInstallationGrant(userId, dto.githubInstallationId);
    const [installation, repository] = await Promise.all([
      this.github.fetchInstallation(dto.githubInstallationId),
      this.github.getInstallationRepository({
        installationId: dto.githubInstallationId,
        repositoryId: dto.githubRepositoryId,
      }),
    ]);

    await this.githubInstallations.upsertInstallation({
      ...installation,
      installedByUserId: userId,
    });

    return this.linkRepo.upsertLink({
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      githubInstallationId: dto.githubInstallationId,
      connectedByUserId: userId,
      repository,
    });
  }

  async disconnectProjectRepository(
    userId: string,
    projectId: string,
    linkId: string,
  ): Promise<void> {
    await this.findAdminProjectOrThrow(userId, projectId);

    const deleted = await this.linkRepo.deleteLink({ projectId, linkId });
    if (!deleted) {
      throw new ProjectRepositoryLinkNotFoundError();
    }
  }

  private async findAdminProjectOrThrow(userId: string, projectId: string) {
    const project = await this.projectRepo.findProjectByIdAndAdminUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return project;
  }

  private async ensureInstallationGrant(
    userId: string,
    githubInstallationId: string,
  ): Promise<void> {
    const hasGrant = await this.githubInstallations.existsInstallationGrant({
      githubInstallationId,
      userId,
    });
    if (!hasGrant) {
      throw new GithubInstallationNotFoundError();
    }
  }
}
