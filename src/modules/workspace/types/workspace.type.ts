export type WorkspaceRow = {
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
};

export type WorkspaceMemberRow = {
  userId: string;
  fullName: string;
  username: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Date | null;
  invitedAt: Date | null;
};

export type InsertedWorkspaceMemberRow = Pick<
  WorkspaceMemberRow,
  'userId' | 'role' | 'joinedAt' | 'invitedAt'
>;
