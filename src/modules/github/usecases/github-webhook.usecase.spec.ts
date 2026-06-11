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
jest.mock('@/core/queue', () => ({
  OciQueueService: jest.fn(),
}));

import { AgentRepository } from '@/modules/agent/repository';
import { AgentDispatchService } from '@/modules/agent/services';
import { GithubInstallationRepository } from '@/modules/github/repository';
import {
  GithubAppService,
  GithubWebhookService,
} from '@/modules/github/services';
import { GithubWebhookUseCase } from '@/modules/github/usecases/github-webhook.usecase';
import { ProjectRepository } from '@/modules/project/repository';

describe('GithubWebhookUseCase', () => {
  const rawBody = Buffer.from('{}');
  const signature = 'sha256=test';
  const repositoryLink = {
    projectId: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    workspaceRepositoryLinkId: '33333333-3333-4333-8333-333333333333',
    githubInstallationId: '123',
    githubRepositoryId: '456',
    repositoryOwner: 'prism-416',
    repositoryName: 'prism-nestjs',
    repositoryFullName: 'prism-416/prism-nestjs',
    repositoryUrl: 'https://github.com/prism-416/prism-nestjs',
    defaultBranch: 'develop',
    visibility: 'private' as const,
    connectedByUserId: '44444444-4444-4444-8444-444444444444',
    connectedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const run = {
    runId: '55555555-5555-4555-8555-555555555555',
    workspaceId: repositoryLink.workspaceId,
    triggeredByUserId: repositoryLink.connectedByUserId,
    workItemId: null,
    parentRunId: null,
    agentType: 'pull-request-review',
    triggerType: 'webhook' as const,
    status: 'queued' as const,
    objective: 'Review GitHub PR #17.',
    systemPromptVersion: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  let github: jest.Mocked<
    Pick<
      GithubAppService,
      'mapWebhookInstallation' | 'createPullRequestComment'
    >
  >;
  let webhooks: jest.Mocked<Pick<GithubWebhookService, 'verifySignature'>>;
  let installations: jest.Mocked<
    Pick<
      GithubInstallationRepository,
      | 'upsertInstallation'
      | 'markInstallationDeleted'
      | 'deleteWorkspaceRepositoryLinksByInstallationRepositories'
    >
  >;
  let projects: jest.Mocked<
    Pick<ProjectRepository, 'findGithubRepositoryLinkByInstallationRepository'>
  >;
  let agentRuns: jest.Mocked<
    Pick<AgentRepository, 'createAgentRunForInternal'>
  >;
  let agentDispatch: jest.Mocked<
    Pick<
      AgentDispatchService,
      'buildRunRequestedEvent' | 'publishRunRequestedEvent'
    >
  >;
  let usecase: GithubWebhookUseCase;

  const pullRequestPayload = (overrides: Record<string, unknown> = {}) => ({
    action: 'opened',
    installation: { id: 123 },
    repository: {
      id: 456,
      full_name: 'prism-416/prism-nestjs',
    },
    pull_request: {
      number: 17,
      draft: false,
      head: { sha: 'abc123' },
    },
    ...overrides,
  });

  beforeEach(() => {
    github = {
      mapWebhookInstallation: jest.fn(),
      createPullRequestComment: jest.fn().mockResolvedValue({
        commentId: 'comment-id',
        url: 'https://github.com/prism-416/prism-nestjs/pull/17#issuecomment-1',
      }),
    };
    webhooks = {
      verifySignature: jest.fn(),
    };
    installations = {
      upsertInstallation: jest.fn(),
      markInstallationDeleted: jest.fn(),
      deleteWorkspaceRepositoryLinksByInstallationRepositories: jest.fn(),
    };
    projects = {
      findGithubRepositoryLinkByInstallationRepository: jest
        .fn()
        .mockResolvedValue(repositoryLink),
    };
    agentRuns = {
      createAgentRunForInternal: jest.fn().mockResolvedValue({
        run,
        wasCreated: true,
      }),
    };
    agentDispatch = {
      buildRunRequestedEvent: jest.fn().mockReturnValue({
        type: 'agent.run.requested',
        version: '1.0',
        runId: run.runId,
      }),
      publishRunRequestedEvent: jest
        .fn()
        .mockResolvedValue({ queueMessageId: 'queue-message-id' }),
    };
    usecase = new GithubWebhookUseCase(
      github as unknown as GithubAppService,
      webhooks as unknown as GithubWebhookService,
      installations as unknown as GithubInstallationRepository,
      projects as unknown as ProjectRepository,
      agentRuns as unknown as AgentRepository,
      agentDispatch as unknown as AgentDispatchService,
    );
  });

  it('creates and dispatches a pull request review run', async () => {
    const response = await usecase.handleWebhook({
      event: 'pull_request',
      deliveryId: 'delivery-id',
      signature,
      rawBody,
      payload: pullRequestPayload(),
    });

    expect(response).toEqual({
      accepted: true,
      event: 'pull_request',
      action: 'opened',
      ignored: false,
    });
    expect(agentRuns.createAgentRunForInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: repositoryLink.workspaceId,
        triggeredByUserId: repositoryLink.connectedByUserId,
        agentType: 'pull-request-review',
        triggerType: 'webhook',
        status: 'queued',
      }),
    );
    const commentParams = github.createPullRequestComment.mock.calls[0][0];
    expect(commentParams).toMatchObject({
      installationId: repositoryLink.githubInstallationId,
      owner: repositoryLink.repositoryOwner,
      repo: repositoryLink.repositoryName,
      pullNumber: 17,
    });
    expect(commentParams.body).toContain(
      'Prism has started reviewing this pull request.',
    );
    expect(
      github.createPullRequestComment.mock.invocationCallOrder[0],
    ).toBeLessThan(
      agentDispatch.publishRunRequestedEvent.mock.invocationCallOrder[0],
    );
    expect(agentDispatch.publishRunRequestedEvent).toHaveBeenCalledTimes(1);
  });

  it('does not republish dispatch events for duplicate pull request deliveries', async () => {
    agentRuns.createAgentRunForInternal.mockResolvedValue({
      run,
      wasCreated: false,
    });

    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload(),
    });

    expect(response.ignored).toBe(false);
    expect(github.createPullRequestComment).not.toHaveBeenCalled();
    expect(agentDispatch.publishRunRequestedEvent).not.toHaveBeenCalled();
  });

  it('does not create initial comments for synchronize events', async () => {
    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload({ action: 'synchronize' }),
    });

    expect(response.ignored).toBe(false);
    expect(github.createPullRequestComment).not.toHaveBeenCalled();
    expect(agentDispatch.publishRunRequestedEvent).toHaveBeenCalledTimes(1);
  });

  it('dispatches the review run when the initial comment fails', async () => {
    github.createPullRequestComment.mockRejectedValueOnce(
      new Error('GitHub is unavailable'),
    );

    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload(),
    });

    expect(response.ignored).toBe(false);
    expect(github.createPullRequestComment).toHaveBeenCalledTimes(1);
    expect(agentDispatch.publishRunRequestedEvent).toHaveBeenCalledTimes(1);
  });

  it('ignores draft pull requests before they are ready for review', async () => {
    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload({
        pull_request: {
          number: 17,
          draft: true,
          head: { sha: 'abc123' },
        },
      }),
    });

    expect(response.ignored).toBe(true);
    expect(agentRuns.createAgentRunForInternal).not.toHaveBeenCalled();
  });

  it('ignores pull request events for repositories without a workspace link', async () => {
    projects.findGithubRepositoryLinkByInstallationRepository.mockResolvedValue(
      null,
    );

    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload(),
    });

    expect(response.ignored).toBe(true);
    expect(agentRuns.createAgentRunForInternal).not.toHaveBeenCalled();
  });

  it('dispatches the review run for a workspace-linked repository without a project connection', async () => {
    projects.findGithubRepositoryLinkByInstallationRepository.mockResolvedValue(
      {
        ...repositoryLink,
        projectId: null,
      },
    );

    const response = await usecase.handleWebhook({
      event: 'pull_request',
      signature,
      rawBody,
      payload: pullRequestPayload(),
    });

    expect(response.ignored).toBe(false);
    expect(agentRuns.createAgentRunForInternal).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: repositoryLink.workspaceId }),
    );
    expect(agentDispatch.buildRunRequestedEvent).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: undefined }),
    );
    expect(agentDispatch.publishRunRequestedEvent).toHaveBeenCalledTimes(1);
  });
});
