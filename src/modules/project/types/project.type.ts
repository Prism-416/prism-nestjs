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
