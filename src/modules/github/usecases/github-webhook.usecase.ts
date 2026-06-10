import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AgentRepository } from '@/modules/agent/repository';
import { AgentDispatchService } from '@/modules/agent/services';
import { GithubWebhookResponseDto } from '@/modules/github/dto';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services/github-app.service';
import { GithubWebhookService } from '@/modules/github/services/github-webhook.service';
import { ProjectRepository } from '@/modules/project/repository';

type GithubWebhookPayload = Record<string, unknown>;

type HandleGithubWebhookParams = {
  event: string;
  deliveryId?: string;
  signature?: string;
  rawBody: Buffer;
  payload: unknown;
};

const PULL_REQUEST_REVIEW_AGENT_TYPE = 'pull-request-review';
const REVIEWABLE_PULL_REQUEST_ACTIONS = new Set([
  'opened',
  'reopened',
  'synchronize',
  'ready_for_review',
]);
const INITIAL_COMMENT_PULL_REQUEST_ACTIONS = new Set([
  'opened',
  'reopened',
  'ready_for_review',
]);
const PULL_REQUEST_REVIEW_STARTED_COMMENT = [
  'Prism has started reviewing this pull request.',
  '',
  "I'll post a review here when it's ready.",
].join('\n');

@Injectable()
export class GithubWebhookUseCase {
  private readonly logger = new Logger(GithubWebhookUseCase.name);

  constructor(
    private readonly github: GithubAppService,
    private readonly webhooks: GithubWebhookService,
    private readonly installations: GithubInstallationRepository,
    private readonly projects: ProjectRepository,
    private readonly agentRuns: AgentRepository,
    private readonly agentDispatch: AgentDispatchService,
  ) {}

  async handleWebhook(
    params: HandleGithubWebhookParams,
  ): Promise<GithubWebhookResponseDto> {
    this.webhooks.verifySignature(params.rawBody, params.signature);

    const payload = this.getPayloadRecord(params.payload);
    const action = this.getOptionalString(payload.action);
    let ignored = false;

    switch (params.event) {
      case 'ping':
        await this.handlePing(payload);
        break;
      case 'installation':
        await this.handleInstallation(action, payload);
        break;
      case 'installation_repositories':
        await this.handleInstallationRepositories(payload);
        break;
      case 'pull_request':
        ignored = !(await this.handlePullRequest(action, payload));
        break;
      default:
        ignored = true;
        this.logger.debug(
          `Ignored GitHub webhook event=${params.event} delivery=${params.deliveryId ?? 'unknown'}`,
        );
    }

    return {
      accepted: true,
      event: params.event,
      action,
      ignored,
    };
  }

  private async handlePing(payload: GithubWebhookPayload): Promise<void> {
    const installation = payload.installation;

    if (!installation) {
      return;
    }

    await this.installations.upsertInstallation({
      ...this.github.mapWebhookInstallation(installation),
      installedByUserId: null,
    });
  }

  private async handleInstallation(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.getInstallationId(payload.installation);

    if (action === 'deleted') {
      await this.installations.markInstallationDeleted(installationId);
      return;
    }

    await this.installations.upsertInstallation({
      ...this.github.mapWebhookInstallation(payload.installation),
      installedByUserId: null,
    });
  }

  private async handleInstallationRepositories(
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installation = this.github.mapWebhookInstallation(
      payload.installation,
    );

    await this.installations.upsertInstallation({
      ...installation,
      installedByUserId: null,
    });

    await this.installations.deleteWorkspaceRepositoryLinksByInstallationRepositories(
      {
        githubInstallationId: installation.githubInstallationId,
        githubRepositoryIds: this.getRepositoryIds(
          payload.repositories_removed,
        ),
      },
    );
  }

  private async handlePullRequest(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<boolean> {
    if (!action || !REVIEWABLE_PULL_REQUEST_ACTIONS.has(action)) {
      return false;
    }

    const pullRequest = this.getPayloadRecord(payload.pull_request);
    const draft = pullRequest.draft === true;
    if (draft && action !== 'ready_for_review') {
      return false;
    }

    const installationId = this.getInstallationId(payload.installation);
    const repositoryId = this.getRepositoryId(payload.repository);
    const pullNumber = this.getNumber(
      pullRequest.number,
      'pull request number',
    );
    const headSha = this.getSha(pullRequest.head);
    const repositoryFullName = this.getRepositoryFullName(payload.repository);
    const link =
      await this.projects.findGithubRepositoryLinkByInstallationRepository({
        githubInstallationId: installationId,
        githubRepositoryId: repositoryId,
      });

    if (!link) {
      this.logger.debug(
        `Ignored pull_request webhook for unlinked repository=${repositoryId} installation=${installationId}`,
      );
      return false;
    }

    const runId = this.buildPullRequestReviewRunId({
      installationId,
      repositoryId,
      pullNumber,
      headSha,
    });
    const objective = [
      `Review GitHub PR #${pullNumber} for ${repositoryFullName}.`,
      `Project: ${link.projectId}.`,
      `Head SHA: ${headSha}.`,
    ].join(' ');
    const result = await this.agentRuns.createAgentRunForInternal({
      workspaceId: link.workspaceId,
      runId,
      triggeredByUserId: link.connectedByUserId ?? undefined,
      agentType: PULL_REQUEST_REVIEW_AGENT_TYPE,
      triggerType: 'webhook',
      status: 'queued',
      objective,
    });

    if (!result) {
      throw new BadRequestException(
        'Unable to create pull request review run.',
      );
    }

    if (!result.wasCreated) {
      return true;
    }

    await this.createPullRequestStartedComment({
      action,
      installationId,
      owner: link.repositoryOwner,
      repo: link.repositoryName,
      pullNumber,
      repositoryFullName,
    });

    const requestedAt = result.run.createdAt.toISOString();
    await this.agentDispatch.publishRunRequestedEvent(
      this.agentDispatch.buildRunRequestedEvent({
        runId,
        workspaceId: link.workspaceId,
        projectId: link.projectId,
        agentType: PULL_REQUEST_REVIEW_AGENT_TYPE,
        requestedAt,
        repositoryFullName,
        pullNumber,
        headSha,
      }),
    );

    return true;
  }

  private async createPullRequestStartedComment(params: {
    action: string;
    installationId: string;
    owner: string;
    repo: string;
    pullNumber: number;
    repositoryFullName: string;
  }): Promise<void> {
    if (!INITIAL_COMMENT_PULL_REQUEST_ACTIONS.has(params.action)) {
      return;
    }

    try {
      await this.github.createPullRequestComment({
        installationId: params.installationId,
        owner: params.owner,
        repo: params.repo,
        pullNumber: params.pullNumber,
        body: PULL_REQUEST_REVIEW_STARTED_COMMENT,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Unable to create initial pull request comment for repository=${params.repositoryFullName} pullNumber=${params.pullNumber}: ${message}`,
      );
    }
  }

  private getPayloadRecord(payload: unknown): GithubWebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid GitHub webhook payload.');
    }

    return payload as GithubWebhookPayload;
  }

  private getInstallationId(installation: unknown): string {
    if (!installation || typeof installation !== 'object') {
      throw new BadRequestException('Invalid GitHub installation payload.');
    }

    const { id } = installation as { id?: unknown };
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new BadRequestException('Invalid GitHub installation id.');
    }

    return String(id);
  }

  private getRepositoryId(repository: unknown): string {
    if (!repository || typeof repository !== 'object') {
      throw new BadRequestException('Invalid GitHub repository payload.');
    }

    const { id } = repository as { id?: unknown };
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new BadRequestException('Invalid GitHub repository id.');
    }

    return String(id);
  }

  private getRepositoryFullName(repository: unknown): string {
    if (!repository || typeof repository !== 'object') {
      throw new BadRequestException('Invalid GitHub repository payload.');
    }

    const { full_name: fullName } = repository as { full_name?: unknown };
    if (typeof fullName !== 'string' || !fullName.trim()) {
      throw new BadRequestException('Invalid GitHub repository full name.');
    }

    return fullName;
  }

  private getSha(head: unknown): string {
    if (!head || typeof head !== 'object') {
      throw new BadRequestException(
        'Invalid GitHub pull request head payload.',
      );
    }

    const { sha } = head as { sha?: unknown };
    if (typeof sha !== 'string' || !sha.trim()) {
      throw new BadRequestException('Invalid GitHub pull request head SHA.');
    }

    return sha;
  }

  private getNumber(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new BadRequestException(`Invalid GitHub ${fieldName}.`);
    }

    return value;
  }

  private buildPullRequestReviewRunId(params: {
    installationId: string;
    repositoryId: string;
    pullNumber: number;
    headSha: string;
  }): string {
    const digest = createHash('sha256')
      .update(
        [
          'github-pr-review',
          params.installationId,
          params.repositoryId,
          String(params.pullNumber),
          params.headSha,
        ].join(':'),
      )
      .digest('hex');

    return [
      digest.slice(0, 8),
      digest.slice(8, 12),
      `4${digest.slice(13, 16)}`,
      `8${digest.slice(17, 20)}`,
      digest.slice(20, 32),
    ].join('-');
  }

  private getRepositoryIds(repositories: unknown): string[] {
    if (!Array.isArray(repositories)) {
      return [];
    }

    return repositories
      .map((repository) => {
        if (!repository || typeof repository !== 'object') {
          return null;
        }

        const { id } = repository as { id?: unknown };

        if (typeof id !== 'string' && typeof id !== 'number') {
          return null;
        }

        return String(id);
      })
      .filter((id): id is string => Boolean(id));
  }

  private getOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
