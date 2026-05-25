export type CommentRow = {
  commentId: string;
  workspaceId: string;
  projectId: string;
  itemId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type WorkItemCommentEmbeddingRow = {
  commentId: string;
  workspaceId: string;
  projectId: string;
  itemId: string;
  embeddedBody: string;
  contentHash: string;
  model: string;
  dimensions: number;
  createdAt: Date;
  embeddedAt: Date;
};

export type SearchCommentsParams = {
  workspaceId: string;
  projectId: string;
  itemId: string;
  limit: number;
  offset: number;
};

export type CreateCommentParams = {
  workspaceId: string;
  projectId: string;
  itemId: string;
  authorUserId: string;
  body: string;
};

export type UpdateCommentParams = {
  workspaceId: string;
  projectId: string;
  itemId: string;
  commentId: string;
  authorUserId: string;
  body: string;
};

export type DeleteCommentParams = {
  workspaceId: string;
  projectId: string;
  itemId: string;
  commentId: string;
  authorUserId: string;
};

export type UpsertWorkItemCommentEmbeddingParams = {
  workspaceId: string;
  projectId: string;
  itemId: string;
  commentId: string;
  embeddedBody: string;
  contentHash: string;
  model: string;
  dimensions: number;
  embedding: number[];
};

export type SearchCommentsResult = {
  comments: CommentRow[];
  total: number;
  limit: number;
  offset: number;
};
