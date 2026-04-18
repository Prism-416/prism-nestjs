export type ProjectRow = {
  projectId: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  locale: string;
  createdAt: Date;
};

export type ProjectSummaryRow = Pick<
  ProjectRow,
  'projectId' | 'workspaceId' | 'name' | 'slug' | 'description' | 'createdAt'
>;

export type ProjectWorkspaceMemberUserRow = {
  userId: string;
};

export type ProjectRoleIdRow = {
  roleId: string;
};

export type ProjectMemberRow = {
  memberId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  assignedAt: Date;
};

export type ProjectMemberListRow = ProjectMemberRow & {
  fullName: string;
  username: string;
  roleNames: string[];
};
