export type WorkspaceRow = {
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
};
