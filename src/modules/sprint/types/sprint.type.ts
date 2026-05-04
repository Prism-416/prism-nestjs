export const SPRINT_STATUSES = ['backlog', 'in_progress', 'done'] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export type SprintProjectRow = {
  projectId: string;
};

export type SprintRow = {
  sprintId: string;
  projectId: string;
  name: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  status: SprintStatus;
  createdAt: Date;
};
