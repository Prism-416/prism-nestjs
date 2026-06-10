import { Injectable } from '@nestjs/common';
import {
  CreatePullRequestReviewForInternalDto,
  CreatePullRequestReviewForInternalResponseDto,
  GetPullRequestForInternalQueryDto,
  PullRequestForInternalResponseDto,
} from '@/modules/project/dto';
import {
  ProjectNotFoundError,
  ProjectRepositoryLinkNotFoundError,
  PullRequestHeadStaleError,
  PullRequestReviewCommentAnchorInvalidError,
} from '@/modules/project/errors';
import { ProjectRepository } from '@/modules/project/repository';
import { GithubAppService } from '@/modules/github/services';
import type {
  GithubPullRequestFile,
  GithubPullRequestReviewComment,
  GithubPullRequestReviewCommentSide,
} from '@/modules/github/types';

@Injectable()
export class PullRequestUseCase {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly github: GithubAppService,
  ) {}

  async getPullRequestForInternal(
    projectId: string,
    pullNumber: number,
    query: GetPullRequestForInternalQueryDto,
  ): Promise<PullRequestForInternalResponseDto> {
    const link = await this.findProjectRepositoryLinkOrThrow(projectId);

    return this.github.getPullRequestContent({
      installationId: link.githubInstallationId,
      owner: link.repositoryOwner,
      repo: link.repositoryName,
      pullNumber,
      includeDiff: query.includeDiff ?? true,
      includeFiles: query.includeFiles ?? true,
    });
  }

  async createPullRequestReviewForInternal(
    projectId: string,
    pullNumber: number,
    dto: CreatePullRequestReviewForInternalDto,
  ): Promise<CreatePullRequestReviewForInternalResponseDto> {
    const link = await this.findProjectRepositoryLinkOrThrow(projectId);
    const comments = this.normalizeReviewComments(dto.comments ?? []);
    const pullRequest =
      comments.length > 0
        ? await this.github.getPullRequestContent({
            installationId: link.githubInstallationId,
            owner: link.repositoryOwner,
            repo: link.repositoryName,
            pullNumber,
            includeDiff: true,
            includeFiles: true,
          })
        : null;
    const headSha =
      pullRequest?.headSha ??
      (await this.github.getPullRequestHeadSha({
        installationId: link.githubInstallationId,
        owner: link.repositoryOwner,
        repo: link.repositoryName,
        pullNumber,
      }));

    if (headSha !== dto.headSha) {
      throw new PullRequestHeadStaleError();
    }

    if (pullRequest) {
      this.assertValidCommentAnchors(pullRequest.files, comments);
    }

    return this.github.createPullRequestReview({
      installationId: link.githubInstallationId,
      owner: link.repositoryOwner,
      repo: link.repositoryName,
      pullNumber,
      headSha: dto.headSha,
      event: dto.event,
      summary: dto.summary,
      comments,
    });
  }

  private async findProjectRepositoryLinkOrThrow(projectId: string) {
    const project = await this.projectRepository.findProjectById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const link =
      await this.projectRepository.findGithubRepositoryLinkByProjectId(
        projectId,
      );
    if (!link) {
      throw new ProjectRepositoryLinkNotFoundError();
    }

    return link;
  }

  private normalizeReviewComments(
    comments: CreatePullRequestReviewForInternalDto['comments'],
  ): GithubPullRequestReviewComment[] {
    return (comments ?? []).map((comment) => ({
      path: comment.path,
      line: comment.line,
      side: comment.side ?? 'RIGHT',
      body: comment.body,
    }));
  }

  private assertValidCommentAnchors(
    files: GithubPullRequestFile[],
    comments: GithubPullRequestReviewComment[],
  ): void {
    const filesByPath = new Map(files.map((file) => [file.filename, file]));

    for (const comment of comments) {
      const file = filesByPath.get(comment.path);
      if (
        !file?.patch ||
        !this.patchContainsLine(file.patch, comment.line, comment.side)
      ) {
        throw new PullRequestReviewCommentAnchorInvalidError();
      }
    }
  }

  private patchContainsLine(
    patch: string,
    line: number,
    side: GithubPullRequestReviewCommentSide,
  ): boolean {
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;

    for (const rawLine of patch.split('\n')) {
      const hunk = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
        inHunk = true;
        continue;
      }

      if (!inHunk || rawLine.startsWith('\\')) {
        continue;
      }

      const marker = rawLine[0];
      if (marker === '+') {
        if (side === 'RIGHT' && newLine === line) {
          return true;
        }
        newLine += 1;
      } else if (marker === '-') {
        if (side === 'LEFT' && oldLine === line) {
          return true;
        }
        oldLine += 1;
      } else {
        if (
          (side === 'RIGHT' && newLine === line) ||
          (side === 'LEFT' && oldLine === line)
        ) {
          return true;
        }
        oldLine += 1;
        newLine += 1;
      }
    }

    return false;
  }
}
