export type GithubInstallationAccountType = 'User' | 'Organization';
export type GithubRepositorySelection = 'all' | 'selected';
export type GithubInstallationStatus = 'active' | 'suspended' | 'deleted';
export type GithubRepositoryVisibility = 'public' | 'private' | 'internal';

export type GithubInstallationState = {
  projectId: string;
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
