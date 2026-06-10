export type GithubInstallationAccountType = 'User' | 'Organization';
export type GithubRepositorySelection = 'all' | 'selected';
export type GithubInstallationStatus = 'active' | 'suspended' | 'deleted';
export type GithubRepositoryVisibility = 'public' | 'private' | 'internal';

export type GithubInstallationState = {
  workspaceId: string;
  userId: string;
  expiresAt: number;
  nonce: string;
};

export type GithubInstallationSummary = {
  githubInstallationId: string;
  accountId: string;
  accountLogin: string;
  accountType: GithubInstallationAccountType;
  repositorySelection: GithubRepositorySelection;
  htmlUrl: string | null;
  installedAt: Date | null;
  suspendedAt: Date | null;
  status: GithubInstallationStatus;
};

export type GithubRepositorySummary = {
  githubRepositoryId: string;
  nodeId: string | null;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string | null;
  visibility: GithubRepositoryVisibility | null;
  private: boolean;
  archived: boolean;
};

export type GithubPullRequestState = 'open' | 'closed' | 'merged';
export type GithubPullRequestFileStatus =
  | 'added'
  | 'modified'
  | 'removed'
  | 'renamed';
export type GithubPullRequestReviewEvent =
  | 'COMMENT'
  | 'APPROVE'
  | 'REQUEST_CHANGES';
export type GithubPullRequestReviewCommentSide = 'LEFT' | 'RIGHT';

export type GithubPullRequestFile = {
  filename: string;
  status: GithubPullRequestFileStatus;
  additions: number;
  deletions: number;
  patch: string;
};

export type GithubPullRequestCommit = {
  sha: string;
  message: string;
};

export type GithubPullRequestContent = {
  pullNumber: number;
  title: string;
  state: GithubPullRequestState;
  headSha: string;
  baseSha: string;
  author: string;
  body: string;
  files: GithubPullRequestFile[];
  commits: GithubPullRequestCommit[];
  truncated: boolean;
};

export type GithubPullRequestReviewComment = {
  path: string;
  line: number;
  side: GithubPullRequestReviewCommentSide;
  body: string;
};

export type GithubPullRequestReviewResult = {
  reviewId: string;
  url: string;
};
