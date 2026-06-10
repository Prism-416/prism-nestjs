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
  'archived',
] as const;
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export type WorkItemRow = {
  itemId: string;
  workspaceId: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string;
  startDate: string | null;
  dueDate: string | null;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  sortOrder: number;
  statusChangedAt: Date;
  createdAt: Date;
};

export type WorkItemAssigneeRow = {
  userId: string;
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

export type TrashedWorkItemRow = WorkItemDetailRow & {
  deletedAt: Date;
  descendantCount: number;
};

export type WorkItemEmbeddingRow = {
  itemId: string;
  workspaceId: string;
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
  workspaceId: string;
  projectId: string;
  query?: string;
  parentId?: string;
  topLevel?: boolean;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
  assigneeUsername?: string;
  labelName?: string;
  limit: number;
  offset: number;
};

export type UpsertWorkItemEmbeddingParams = {
  workspaceId: string;
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

export type SimilarWorkItemRow = {
  itemId: string;
  parentId: string | null;
  title: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  similarity: number;
};

export type FindSimilarWorkItemsParams = {
  workspaceId: string;
  projectId: string;
  embedding: number[];
  limit: number;
};

export type ReorderWorkItemParams = {
  itemId: string;
  status: WorkItemStatus;
  sortOrder: number;
};
