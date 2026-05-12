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
