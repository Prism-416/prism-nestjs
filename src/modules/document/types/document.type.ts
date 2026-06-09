import type { WorkspaceMemberRole } from '@/modules/workspace/constants';

export type DocumentSourceKind = 'direct' | 'work_item';
export type DocumentSourceFilter = DocumentSourceKind;

export type DocumentRow = {
  documentId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageETag: string | null;
  storageVersionId: string | null;
  sourceKind: DocumentSourceKind;
  sourceWorkItemId: string | null;
  sourceWorkItemIdSnapshot: string | null;
  sourceWorkItemTitle: string | null;
  sourceWorkItemTitleSnapshot: string | null;
  sourceCommentId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentChunkRow = {
  chunkId: string;
  documentId: string;
  workspaceId: string;
  projectId: string;
  chunkIndex: number;
  headingPath: string[] | null;
  contentHash: string;
  tokenCount: number | null;
  charCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentChunkEmbeddingRow = {
  chunkId: string;
  workspaceId: string;
  projectId: string;
  model: string;
  dimensions: number;
  contentHash: string;
  createdAt: Date;
  embeddedAt: Date;
};

export type DocumentProjectRow = {
  projectId: string;
  workspaceId: string;
};

export type DocumentMemberProjectRow = DocumentProjectRow & {
  role: WorkspaceMemberRole;
};

export type DocumentDownloadRef = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageObjectName: string;
  storageVersionId: string | null;
};

export type DocumentDownloadResult = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  body: Buffer;
};

export type DeletedDocumentRow = {
  documentId: string;
  storageObjectName: string;
  storageVersionId: string | null;
  sourceCommentId: string | null;
  createdBy: string;
};

export type DocumentUploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type CreateDocumentParams = {
  documentId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageObjectName: string;
  storageETag?: string;
  storageVersionId?: string;
  sourceKind?: DocumentSourceKind;
  sourceWorkItemId?: string | null;
  sourceWorkItemIdSnapshot?: string | null;
  sourceWorkItemTitleSnapshot?: string | null;
  sourceCommentId?: string | null;
  createdBy: string;
};

export type SearchDocumentsParams = {
  workspaceId: string;
  projectId: string;
  query?: string;
  workItemId?: string;
  source?: DocumentSourceFilter;
  limit: number;
  offset: number;
};

export type SearchDocumentsResult = {
  items: DocumentRow[];
  total: number;
  limit: number;
  offset: number;
};

export type DocumentSourceGroupRow = {
  kind: DocumentSourceFilter;
  workItemId: string | null;
  workItemIdSnapshot: string | null;
  title: string;
  count: number;
};

export type UpsertDocumentChunkInput = {
  chunkIndex: number;
  headingPath?: string[];
  content: string;
  contentHash: string;
  tokenCount?: number;
  charCount?: number;
};

export type UpsertDocumentChunksParams = {
  workspaceId: string;
  projectId: string;
  documentId: string;
  chunks: UpsertDocumentChunkInput[];
};

export type UpsertDocumentChunkEmbeddingInput = {
  chunkId: string;
  contentHash: string;
  model: string;
  dimensions: number;
  embedding: number[];
};

export type UpsertDocumentChunkEmbeddingsParams = {
  workspaceId: string;
  projectId: string;
  documentId: string;
  embeddings: UpsertDocumentChunkEmbeddingInput[];
};
