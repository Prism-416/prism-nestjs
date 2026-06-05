export const SPRINT_STATUSES = [
  'planned',
  'active',
  'closed',
  'cancelled',
] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export type SprintWorkspaceRow = {
  workspaceId: string;
};

export type SprintWorkspaceAccessRow = SprintWorkspaceRow & {
  role: string | null;
};

export type SprintRow = {
  sprintId: string;
  workspaceId: string;
  name: string;
  goal: string | null;
  startsAt: Date;
  endsAt: Date;
  status: SprintStatus;
  createdAt: Date;
};
