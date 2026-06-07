import { Injectable } from '@nestjs/common';
import {
  GithubInstallationAuthorizeResponseDto,
  GithubRepositoryOptionResponseDto,
} from '@/modules/github/dto';
import { GithubInstallationNotFoundError } from '@/modules/github/errors';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services';
import {
  CreateWorkspaceRepositoryLinkDto,
  WorkspaceRepositoryLinkResponseDto,
} from '@/modules/workspace/dto';
import {
  WorkspaceNotFoundError,
  WorkspaceRepositoryLinkNotFoundError,
} from '@/modules/workspace/errors';
import {
  WorkspaceRepository,
  WorkspaceRepositoryLinkRepository,
} from '@/modules/workspace/repository';

@Injectable()
export class WorkspaceRepositoryLinkUseCase {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly linkRepo: WorkspaceRepositoryLinkRepository,
    private readonly github: GithubAppService,
    private readonly githubInstallations: GithubInstallationRepository,
  ) {}

  async createGithubInstallationAuthorization(
    userId: string,
    workspaceId: string,
  ): Promise<GithubInstallationAuthorizeResponseDto> {
    await this.findAdminWorkspaceOrThrow(userId, workspaceId);

    return this.github.createInstallationAuthorization({ userId, workspaceId });
  }

  async listGithubInstallationRepositories(
    userId: string,
    workspaceId: string,
    githubInstallationId: string,
  ): Promise<GithubRepositoryOptionResponseDto[]> {
    await this.findAdminWorkspaceOrThrow(userId, workspaceId);
    await this.ensureInstallationWorkspaceGrant(
      workspaceId,
      githubInstallationId,
    );

    return this.github.listInstallationRepositories(githubInstallationId);
  }

  async listWorkspaceRepositories(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRepositoryLinkResponseDto[]> {
    const workspace = await this.workspaceRepo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return this.linkRepo.findLinksByWorkspaceId(workspaceId);
  }

  async connectWorkspaceRepository(
    userId: string,
    workspaceId: string,
    dto: CreateWorkspaceRepositoryLinkDto,
  ): Promise<WorkspaceRepositoryLinkResponseDto> {
    const workspace = await this.findAdminWorkspaceOrThrow(userId, workspaceId);
    await this.ensureInstallationWorkspaceGrant(
      workspace.workspaceId,
      dto.githubInstallationId,
    );
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
      workspaceId: workspace.workspaceId,
      githubInstallationId: dto.githubInstallationId,
      connectedByUserId: userId,
      repository,
    });
  }

  async disconnectWorkspaceRepository(
    userId: string,
    workspaceId: string,
    linkId: string,
  ): Promise<void> {
    const workspace = await this.findAdminWorkspaceOrThrow(userId, workspaceId);

    const deleted = await this.linkRepo.deleteLink({
      workspaceId: workspace.workspaceId,
      linkId,
    });
    if (!deleted) {
      throw new WorkspaceRepositoryLinkNotFoundError();
    }
  }

  private async findAdminWorkspaceOrThrow(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepo.findWorkspaceByIdAndAdminUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    return workspace;
  }

  private async ensureInstallationWorkspaceGrant(
    workspaceId: string,
    githubInstallationId: string,
  ): Promise<void> {
    const hasGrant =
      await this.githubInstallations.existsInstallationWorkspaceGrant({
        githubInstallationId,
        workspaceId,
      });
    if (!hasGrant) {
      throw new GithubInstallationNotFoundError();
    }
  }
}
