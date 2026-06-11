jest.mock('octokit', () => ({
  App: jest.fn(),
  RequestError: class RequestError extends Error {
    status: number;

    constructor(message = 'Request failed', status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

import { PullRequestUseCase } from '@/modules/project/usecases/pull-request.usecase';
import { ProjectRepository } from '@/modules/project/repository';
import { GithubAppService } from '@/modules/github/services';
import {
  PullRequestHeadStaleError,
  PullRequestReviewCommentAnchorInvalidError,
} from '@/modules/project/errors';

describe('PullRequestUseCase', () => {
  const project = {
    projectId: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Project',
    slug: 'project',
    description: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const link = {
    projectId: project.projectId,
    workspaceId: project.workspaceId,
    githubInstallationId: '123',
    githubRepositoryId: '456',
    repositoryOwner: 'prizmatic',
    repositoryName: 'prism',
    repositoryFullName: 'prizmatic/prism',
  };
  const dto = {
    requestedByUserId: '33333333-3333-4333-8333-333333333333',
    repositoryFullName: link.repositoryFullName,
    headSha: 'expected-head',
    event: 'COMMENT' as const,
    summary: 'Review summary',
  };

  let projectRepository: jest.Mocked<
    Pick<
      ProjectRepository,
      | 'findProjectById'
      | 'findGithubRepositoryLinkByProjectId'
      | 'findWorkspaceRepositoryLinkByProjectAndRepository'
    >
  >;
  let github: jest.Mocked<
    Pick<
      GithubAppService,
      | 'getPullRequestContent'
      | 'getPullRequestHeadSha'
      | 'createPullRequestReview'
    >
  >;
  let usecase: PullRequestUseCase;

  beforeEach(() => {
    projectRepository = {
      findProjectById: jest.fn().mockResolvedValue(project),
      findGithubRepositoryLinkByProjectId: jest.fn().mockResolvedValue(link),
      findWorkspaceRepositoryLinkByProjectAndRepository: jest
        .fn()
        .mockResolvedValue(link),
    };
    github = {
      getPullRequestContent: jest.fn(),
      getPullRequestHeadSha: jest.fn(),
      createPullRequestReview: jest.fn(),
    };
    usecase = new PullRequestUseCase(
      projectRepository as unknown as ProjectRepository,
      github as unknown as GithubAppService,
    );
  });

  it('rejects a stale review head SHA with 409', async () => {
    github.getPullRequestHeadSha.mockResolvedValue('moved-head');

    await expect(
      usecase.createPullRequestReviewForInternal(project.projectId, 12, dto),
    ).rejects.toBeInstanceOf(PullRequestHeadStaleError);
    expect(github.createPullRequestReview).not.toHaveBeenCalled();
  });

  it('rejects review comments whose anchor is not in the PR diff with 422', async () => {
    github.getPullRequestContent.mockResolvedValue({
      pullNumber: 12,
      title: 'Improve project API',
      state: 'open',
      headSha: 'expected-head',
      baseSha: 'base-head',
      author: 'octocat',
      body: '',
      files: [
        {
          filename: 'src/app.ts',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '@@ -10,2 +10,3 @@\n const a = 1;\n+const b = 2;',
        },
      ],
      commits: [],
      truncated: false,
    });

    await expect(
      usecase.createPullRequestReviewForInternal(project.projectId, 12, {
        ...dto,
        comments: [
          {
            path: 'src/app.ts',
            line: 99,
            body: 'This line is not in the diff.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PullRequestReviewCommentAnchorInvalidError);
    expect(github.createPullRequestReview).not.toHaveBeenCalled();
  });
});
