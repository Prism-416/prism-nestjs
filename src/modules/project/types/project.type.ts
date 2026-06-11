export type ProjectRow = {
  projectId: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
};

export type ProjectSummaryRow = Pick<
  ProjectRow,
  'projectId' | 'workspaceId' | 'name' | 'slug' | 'description' | 'createdAt'
>;

export type ProjectWorkspaceMemberUserRow = {
  userId: string;
};

export type ProjectGithubRepositoryLinkRow = {
  projectId: string;
  workspaceId: string;
  workspaceRepositoryLinkId: string;
  githubInstallationId: string;
  githubRepositoryId: string;
  repositoryOwner: string;
  repositoryName: string;
  repositoryFullName: string;
  repositoryUrl: string;
  defaultBranch: string | null;
  visibility: 'public' | 'private' | 'internal' | null;
  connectedByUserId: string | null;
  connectedAt: Date;
};

// Repositories are bound to workspaces, not projects, so the webhook lookup
// resolves a workspace repository link and a project connection is optional.
export type WorkspaceRepositoryLinkRow = Omit<
  ProjectGithubRepositoryLinkRow,
  'projectId'
> & {
  projectId: string | null;
};
