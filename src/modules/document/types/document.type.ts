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

export type DeletedDocumentRow = {
  storageObjectName: string;
  storageVersionId: string | null;
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
  createdBy: string;
};

export type SearchDocumentsParams = {
  workspaceId: string;
  projectId: string;
  query?: string;
  limit: number;
  offset: number;
};

export type SearchDocumentsResult = {
  items: DocumentRow[];
  total: number;
  limit: number;
  offset: number;
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
