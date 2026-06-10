import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { App, RequestError } from 'octokit';
import {
  GithubInstallationNotFoundError,
  GithubPullRequestNotFoundError,
  GithubInstallationStateError,
  GithubRepositoryNotFoundError,
} from '@/modules/github/errors';
import type {
  GithubInstallationAccountType,
  GithubInstallationState,
  GithubInstallationStatus,
  GithubPullRequestCommit,
  GithubPullRequestContent,
  GithubPullRequestFile,
  GithubPullRequestFileStatus,
  GithubPullRequestReviewComment,
  GithubPullRequestReviewEvent,
  GithubPullRequestReviewResult,
  GithubPullRequestState,
  GithubInstallationSummary,
  GithubRepositorySelection,
  GithubRepositorySummary,
  GithubRepositoryVisibility,
} from '@/modules/github/types';

type GithubInstallationOctokit = Awaited<
  ReturnType<App['getInstallationOctokit']>
>;

type GithubApiAccount = {
  id?: number | string;
  login?: string;
  type?: string;
};

type GithubApiInstallation = {
  id?: number | string;
  account?: GithubApiAccount | null;
  repository_selection?: string;
  html_url?: string | null;
  created_at?: string | null;
  suspended_at?: string | null;
};

type GithubApiRepository = {
  id?: number | string;
  node_id?: string | null;
  owner?: GithubApiAccount | null;
  name?: string;
  full_name?: string;
  html_url?: string;
  default_branch?: string | null;
  visibility?: string | null;
  private?: boolean;
  archived?: boolean;
};

type GithubRepositoryListResponse = {
  repositories?: GithubApiRepository[];
};

type GithubApiPullRequest = {
  number?: number;
  title?: string;
  state?: string;
  merged?: boolean;
  head?: { sha?: string } | null;
  base?: { sha?: string } | null;
  user?: { login?: string } | null;
  body?: string | null;
};

type GithubApiPullRequestFile = {
  filename?: string;
  status?: string;
  additions?: number;
  deletions?: number;
  patch?: string;
};

type GithubApiPullRequestCommit = {
  sha?: string;
  commit?: { message?: string } | null;
};

type GithubApiPullRequestReview = {
  id?: number | string;
  html_url?: string | null;
  url?: string | null;
};

type GithubSignedStatePayload = GithubInstallationState;

export type GithubInstallationAuthorization = {
  authorizationUrl: string;
  state: string;
  expiresAt: Date;
};

@Injectable()
export class GithubAppService {
  private readonly pullRequestFilePageSize = 100;
  private readonly maxPullRequestFiles = 300;
  private readonly maxPullRequestPatchChars = 250000;
  private app?: App;

  constructor(private readonly configService: ConfigService) {}

  createInstallationAuthorization(params: {
    workspaceId: string;
    userId: string;
  }): GithubInstallationAuthorization {
    const expiresAt = Date.now() + this.getStateTtlSec() * 1000;
    const state = this.signState({
      workspaceId: params.workspaceId,
      userId: params.userId,
      expiresAt,
      nonce: randomBytes(16).toString('hex'),
    });
    const authorizationUrl = new URL(this.getInstallationUrl());

    authorizationUrl.searchParams.set('state', state);

    return {
      authorizationUrl: authorizationUrl.toString(),
      state,
      expiresAt: new Date(expiresAt),
    };
  }

  readInstallationState(state: string): GithubInstallationState {
    const parsed = this.readSignedState(state);

    if (
      typeof parsed.workspaceId !== 'string' ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.nonce !== 'string' ||
      parsed.expiresAt <= Date.now()
    ) {
      throw new GithubInstallationStateError();
    }

    return parsed;
  }

  async fetchInstallation(
    installationId: string,
  ): Promise<GithubInstallationSummary> {
    try {
      const { data } = await this.getApp().octokit.request(
        'GET /app/installations/{installation_id}',
        {
          installation_id: Number(installationId),
        },
      );

      return this.mapInstallation(data as GithubApiInstallation);
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        throw new GithubInstallationNotFoundError();
      }

      throw error;
    }
  }

  mapWebhookInstallation(payload: unknown): GithubInstallationSummary {
    return this.mapInstallation(payload as GithubApiInstallation);
  }

  async listInstallationRepositories(
    installationId: string,
  ): Promise<GithubRepositorySummary[]> {
    const octokit = await this.getApp().getInstallationOctokit(
      Number(installationId),
    );
    const repositories: GithubRepositorySummary[] = [];

    for (let page = 1; ; page += 1) {
      const { data } = await octokit.request('GET /installation/repositories', {
        per_page: 100,
        page,
      });
      const response = data as GithubRepositoryListResponse;
      const pageRepositories = response.repositories ?? [];

      repositories.push(
        ...pageRepositories.map((repository) => this.mapRepository(repository)),
      );

      if (pageRepositories.length < 100) {
        break;
      }
    }

    return repositories;
  }

  async getInstallationRepository(params: {
    installationId: string;
    repositoryId: string;
  }): Promise<GithubRepositorySummary> {
    const repositories = await this.listInstallationRepositories(
      params.installationId,
    );
    const repository = repositories.find(
      (item) => item.githubRepositoryId === params.repositoryId,
    );

    if (!repository) {
      throw new GithubRepositoryNotFoundError();
    }

    return repository;
  }

  async getPullRequestContent(params: {
    installationId: string;
    owner: string;
    repo: string;
    pullNumber: number;
    includeDiff: boolean;
    includeFiles: boolean;
  }): Promise<GithubPullRequestContent> {
    const octokit = await this.getApp().getInstallationOctokit(
      Number(params.installationId),
    );
    const pullRequest = await this.fetchPullRequest(octokit, params);
    const [filesResult, commits] = await Promise.all([
      params.includeFiles
        ? this.listPullRequestFiles(octokit, params, params.includeDiff)
        : Promise.resolve({ files: [], truncated: false }),
      this.listPullRequestCommits(octokit, params),
    ]);

    return {
      ...pullRequest,
      files: filesResult.files,
      commits,
      truncated: filesResult.truncated,
    };
  }

  async getPullRequestHeadSha(params: {
    installationId: string;
    owner: string;
    repo: string;
    pullNumber: number;
  }): Promise<string> {
    const octokit = await this.getApp().getInstallationOctokit(
      Number(params.installationId),
    );
    const pullRequest = await this.fetchPullRequest(octokit, params);

    return pullRequest.headSha;
  }

  async createPullRequestReview(params: {
    installationId: string;
    owner: string;
    repo: string;
    pullNumber: number;
    headSha: string;
    event: GithubPullRequestReviewEvent;
    summary: string;
    comments: GithubPullRequestReviewComment[];
  }): Promise<GithubPullRequestReviewResult> {
    const octokit = await this.getApp().getInstallationOctokit(
      Number(params.installationId),
    );

    try {
      const { data } = await octokit.request(
        'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
        {
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pullNumber,
          commit_id: params.headSha,
          event: params.event,
          body: params.summary,
          comments: params.comments.map((comment) => ({
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
          })),
        },
      );
      const review = data as GithubApiPullRequestReview;

      if (!review.id || (!review.html_url && !review.url)) {
        throw new BadRequestException(
          'Invalid GitHub pull request review response.',
        );
      }

      return {
        reviewId: String(review.id),
        url: review.html_url ?? String(review.url),
      };
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        throw new GithubPullRequestNotFoundError();
      }

      throw error;
    }
  }

  buildInstallationResultRedirectUrl(params: {
    workspaceId?: string;
    installationId?: string;
    setupAction?: string;
    error?: string;
    errorDescription?: string;
    errorUri?: string;
  }): string {
    const redirectUrl = new URL(
      this.getRequiredUrlConfig('GITHUB_INSTALLATION_RESULT_PAGE_URL'),
    );

    this.setOptionalSearchParam(redirectUrl, 'workspaceId', params.workspaceId);
    this.setOptionalSearchParam(
      redirectUrl,
      'installationId',
      params.installationId,
    );
    this.setOptionalSearchParam(redirectUrl, 'setupAction', params.setupAction);
    this.setOptionalSearchParam(redirectUrl, 'error', params.error);
    this.setOptionalSearchParam(
      redirectUrl,
      'error_description',
      params.errorDescription,
    );
    this.setOptionalSearchParam(redirectUrl, 'error_uri', params.errorUri);

    return redirectUrl.toString();
  }

  private getApp(): App {
    if (!this.app) {
      this.app = new App({
        appId: this.getRequiredConfig('GITHUB_APP_ID'),
        privateKey: this.getPrivateKey(),
      });
    }

    return this.app;
  }

  private async fetchPullRequest(
    octokit: GithubInstallationOctokit,
    params: {
      owner: string;
      repo: string;
      pullNumber: number;
    },
  ): Promise<
    Omit<GithubPullRequestContent, 'files' | 'commits' | 'truncated'>
  > {
    try {
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        {
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pullNumber,
        },
      );

      return this.mapPullRequest(data as GithubApiPullRequest);
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        throw new GithubPullRequestNotFoundError();
      }

      throw error;
    }
  }

  private async listPullRequestFiles(
    octokit: GithubInstallationOctokit,
    params: {
      owner: string;
      repo: string;
      pullNumber: number;
    },
    includeDiff: boolean,
  ): Promise<{ files: GithubPullRequestFile[]; truncated: boolean }> {
    const files: GithubPullRequestFile[] = [];
    let truncated = false;
    let patchChars = 0;

    for (let page = 1; ; page += 1) {
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
        {
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pullNumber,
          per_page: this.pullRequestFilePageSize,
          page,
        },
      );
      const pageFiles = data as GithubApiPullRequestFile[];

      for (const file of pageFiles) {
        if (files.length >= this.maxPullRequestFiles) {
          truncated = true;
          break;
        }

        const mappedFile = this.mapPullRequestFile(file);
        if (!includeDiff) {
          mappedFile.patch = '';
        } else if (
          mappedFile.patch &&
          patchChars + mappedFile.patch.length > this.maxPullRequestPatchChars
        ) {
          mappedFile.patch = '';
          truncated = true;
        }

        patchChars += mappedFile.patch.length;
        files.push(mappedFile);
      }

      if (
        truncated ||
        pageFiles.length < this.pullRequestFilePageSize ||
        files.length >= this.maxPullRequestFiles
      ) {
        if (pageFiles.length === this.pullRequestFilePageSize) {
          truncated = truncated || files.length >= this.maxPullRequestFiles;
        }
        break;
      }
    }

    return { files, truncated };
  }

  private async listPullRequestCommits(
    octokit: GithubInstallationOctokit,
    params: {
      owner: string;
      repo: string;
      pullNumber: number;
    },
  ): Promise<GithubPullRequestCommit[]> {
    const commits: GithubPullRequestCommit[] = [];

    for (let page = 1; ; page += 1) {
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits',
        {
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pullNumber,
          per_page: 100,
          page,
        },
      );
      const pageCommits = data as GithubApiPullRequestCommit[];

      commits.push(
        ...pageCommits.map((commit) => this.mapPullRequestCommit(commit)),
      );

      if (pageCommits.length < 100) {
        break;
      }
    }

    return commits;
  }

  private mapInstallation(
    installation: GithubApiInstallation,
  ): GithubInstallationSummary {
    const account = installation.account;
    if (!installation.id || !account?.id || !account.login || !account.type) {
      throw new BadRequestException('Invalid GitHub installation response.');
    }

    const suspendedAt = this.parseOptionalDate(installation.suspended_at);

    return {
      githubInstallationId: String(installation.id),
      accountId: String(account.id),
      accountLogin: account.login,
      accountType: this.normalizeAccountType(account.type),
      repositorySelection: this.normalizeRepositorySelection(
        installation.repository_selection,
      ),
      htmlUrl: installation.html_url ?? null,
      installedAt: this.parseOptionalDate(installation.created_at),
      suspendedAt,
      status: this.getInstallationStatus(suspendedAt),
    };
  }

  private mapRepository(
    repository: GithubApiRepository,
  ): GithubRepositorySummary {
    if (
      !repository.id ||
      !repository.owner?.login ||
      !repository.name ||
      !repository.full_name ||
      !repository.html_url
    ) {
      throw new BadRequestException('Invalid GitHub repository response.');
    }

    return {
      githubRepositoryId: String(repository.id),
      nodeId: repository.node_id ?? null,
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      htmlUrl: repository.html_url,
      defaultBranch: repository.default_branch ?? null,
      visibility: this.normalizeVisibility(
        repository.visibility,
        repository.private ?? false,
      ),
      private: repository.private ?? false,
      archived: repository.archived ?? false,
    };
  }

  private mapPullRequest(
    pullRequest: GithubApiPullRequest,
  ): Omit<GithubPullRequestContent, 'files' | 'commits' | 'truncated'> {
    if (
      !pullRequest.number ||
      !pullRequest.title ||
      !pullRequest.state ||
      !pullRequest.head?.sha ||
      !pullRequest.base?.sha ||
      !pullRequest.user?.login
    ) {
      throw new BadRequestException('Invalid GitHub pull request response.');
    }

    return {
      pullNumber: pullRequest.number,
      title: pullRequest.title,
      state: this.normalizePullRequestState(
        pullRequest.state,
        pullRequest.merged ?? false,
      ),
      headSha: pullRequest.head.sha,
      baseSha: pullRequest.base.sha,
      author: pullRequest.user.login,
      body: pullRequest.body ?? '',
    };
  }

  private mapPullRequestFile(
    file: GithubApiPullRequestFile,
  ): GithubPullRequestFile {
    if (
      !file.filename ||
      typeof file.additions !== 'number' ||
      typeof file.deletions !== 'number'
    ) {
      throw new BadRequestException(
        'Invalid GitHub pull request file response.',
      );
    }

    return {
      filename: file.filename,
      status: this.normalizePullRequestFileStatus(file.status),
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch ?? '',
    };
  }

  private mapPullRequestCommit(
    commit: GithubApiPullRequestCommit,
  ): GithubPullRequestCommit {
    if (!commit.sha || !commit.commit?.message) {
      throw new BadRequestException(
        'Invalid GitHub pull request commit response.',
      );
    }

    return {
      sha: commit.sha,
      message: commit.commit.message,
    };
  }

  private normalizeAccountType(
    accountType: string,
  ): GithubInstallationAccountType {
    return accountType === 'Organization' ? 'Organization' : 'User';
  }

  private normalizeRepositorySelection(
    selection?: string,
  ): GithubRepositorySelection {
    return selection === 'all' ? 'all' : 'selected';
  }

  private normalizeVisibility(
    visibility: string | null | undefined,
    isPrivate: boolean,
  ): GithubRepositoryVisibility | null {
    if (
      visibility === 'public' ||
      visibility === 'private' ||
      visibility === 'internal'
    ) {
      return visibility;
    }

    return isPrivate ? 'private' : 'public';
  }

  private normalizePullRequestState(
    state: string,
    merged: boolean,
  ): GithubPullRequestState {
    if (merged) {
      return 'merged';
    }

    return state === 'closed' ? 'closed' : 'open';
  }

  private normalizePullRequestFileStatus(
    status: string | null | undefined,
  ): GithubPullRequestFileStatus {
    if (
      status === 'added' ||
      status === 'modified' ||
      status === 'removed' ||
      status === 'renamed'
    ) {
      return status;
    }

    return 'modified';
  }

  private getInstallationStatus(
    suspendedAt: Date | null,
  ): GithubInstallationStatus {
    return suspendedAt ? 'suspended' : 'active';
  }

  private signState(payload: GithubSignedStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private readSignedState(state: string): GithubSignedStatePayload {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new GithubInstallationStateError();
    }

    const expectedSignature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    if (
      !this.safeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      throw new GithubInstallationStateError();
    }

    try {
      return JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as GithubSignedStatePayload;
    } catch {
      throw new GithubInstallationStateError();
    }
  }

  private safeEqual(a: Buffer, b: Buffer): boolean {
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private getInstallationUrl(): string {
    const explicitUrl = this.getOptionalConfig('GITHUB_APP_INSTALL_URL');
    if (explicitUrl) {
      return this.normalizeUrl(explicitUrl, 'GITHUB_APP_INSTALL_URL');
    }

    const slug = this.getRequiredConfig('GITHUB_APP_SLUG');

    return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`;
  }

  private getPrivateKey(): string {
    return this.getRequiredConfig('GITHUB_APP_PRIVATE_KEY').replace(
      /\\n/g,
      '\n',
    );
  }

  private getStateTtlSec(): number {
    return this.configService.get<number>('GITHUB_APP_STATE_TTL_SEC', 600);
  }

  private getStateSecret(): string {
    return (
      this.getOptionalConfig('GITHUB_APP_STATE_SECRET') ??
      this.getOptionalConfig('GITHUB_OAUTH_STATE_SECRET') ??
      this.getRequiredConfig('JWT_SECRET')
    );
  }

  private getRequiredUrlConfig(key: string): string {
    return this.normalizeUrl(this.getRequiredConfig(key), key);
  }

  private normalizeUrl(value: string, key: string): string {
    try {
      return new URL(value).toString();
    } catch {
      throw new InternalServerErrorException(`${key} must be a valid URL.`);
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.getOptionalConfig(key);
    if (!value) {
      throw new InternalServerErrorException(`${key} is required.`);
    }

    return value;
  }

  private getOptionalConfig(key: string): string | null {
    const value = this.configService.get<string>(key);

    return value?.trim() ? value.trim() : null;
  }

  private parseOptionalDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private setOptionalSearchParam(url: URL, key: string, value?: string): void {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
}
