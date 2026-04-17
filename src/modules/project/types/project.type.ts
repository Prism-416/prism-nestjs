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
