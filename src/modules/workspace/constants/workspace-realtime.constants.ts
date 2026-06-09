export const WORKSPACE_REALTIME_NAMESPACE = '/workspaces';

export const WORKSPACE_REALTIME_EVENTS = {
  WORKSPACE_JOIN: 'workspace.join',
  WORKSPACE_JOINED: 'workspace.joined',
  WORKSPACE_LEAVE: 'workspace.leave',
  WORKSPACE_LEFT: 'workspace.left',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  SPRINT_CREATED: 'sprint.created',
  SPRINT_UPDATED: 'sprint.updated',
  SPRINT_DELETED: 'sprint.deleted',
  SPRINT_WORK_ITEMS_CHANGED: 'sprint.work_items_changed',
  WORKSPACE_MEMBER_CREATED: 'workspace_member.created',
  WORKSPACE_MEMBER_UPDATED: 'workspace_member.updated',
  WORKSPACE_MEMBER_REMOVED: 'workspace_member.removed',
  WORKSPACE_JOBS_CHANGED: 'workspace_jobs.changed',
  WORKSPACE_JOB_DELETED: 'workspace_job.deleted',
} as const;
