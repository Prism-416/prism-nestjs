export type CommentRow = {
  commentId: string;
  projectId: string;
  itemId: string;
  authorUserId: string;
  authorUsername: string;
  body: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SearchCommentsParams = {
  projectId: string;
  itemId: string;
  limit: number;
  offset: number;
};

export type CreateCommentParams = {
  projectId: string;
  itemId: string;
  authorUserId: string;
  body: string;
};

export type SearchCommentsResult = {
  comments: CommentRow[];
  total: number;
  limit: number;
  offset: number;
};
