export type DocumentRow = {
  documentId: string;
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
  projectId: string;
  chunkIndex: number;
  headingPath: string[] | null;
  contentHash: string;
  tokenCount: number | null;
  charCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentProjectRow = {
  projectId: string;
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
  projectId: string;
  documentId: string;
  chunks: UpsertDocumentChunkInput[];
};
