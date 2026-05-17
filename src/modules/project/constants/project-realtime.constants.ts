export const PROJECT_REALTIME_NAMESPACE = '/projects';

export const PROJECT_REALTIME_EVENTS = {
  PROJECT_JOIN: 'project.join',
  PROJECT_JOINED: 'project.joined',
  PROJECT_LEAVE: 'project.leave',
  PROJECT_LEFT: 'project.left',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  WORK_ITEM_CREATED: 'work_item.created',
  WORK_ITEM_UPDATED: 'work_item.updated',
  WORK_ITEM_DELETED: 'work_item.deleted',
} as const;
