export const WORK_ITEM_TYPES = ['epic', 'story', 'task'] as const;
export const WORK_ITEM_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;
export const WORK_ITEM_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export type WorkItemRow = {
  itemId: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  statusChangedAt: Date;
  createdAt: Date;
};

export type WorkItemAssigneeRow = {
  memberId: string;
  username: string;
};

export type WorkItemLabelRow = {
  labelId: string;
  label: string;
};

export type WorkItemDetailRow = WorkItemRow & {
  assigneeUsernames: string[];
  labelNames: string[];
};

export type WorkItemEmbeddingRow = {
  itemId: string;
  projectId: string;
  embeddedTitle: string;
  embeddedDescription: string;
  contentHash: string;
  model: string;
  dimensions: number;
  createdAt: Date;
  embeddedAt: Date;
};

export type SearchWorkItemsParams = {
  projectId: string;
  query?: string;
  parentId?: string;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
  assigneeUsername?: string;
  labelName?: string;
  limit: number;
  offset: number;
};

export type UpsertWorkItemEmbeddingParams = {
  projectId: string;
  itemId: string;
  embeddedTitle: string;
  embeddedDescription: string;
  contentHash: string;
  model: string;
  dimensions: number;
  embedding: number[];
};

export type SearchWorkItemsResult = {
  items: WorkItemDetailRow[];
  total: number;
  limit: number;
  offset: number;
};
