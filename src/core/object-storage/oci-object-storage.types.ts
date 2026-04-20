import { Readable } from 'node:stream';

export type OciObjectStorageBody =
  | Uint8Array
  | Buffer
  | Blob
  | Readable
  | ReadableStream
  | string;

export type OciObjectStorageRange = {
  startByte?: number;
  endByte?: number;
  contentLength?: number;
};

type OciObjectStorageLocation = {
  namespaceName?: string;
  bucketName?: string;
};

export type PutObjectInput = OciObjectStorageLocation & {
  objectName: string;
  body: OciObjectStorageBody;
  contentLength?: number;
  ifMatch?: string;
  ifNoneMatch?: string;
  opcClientRequestId?: string;
  contentMD5?: string;
  contentType?: string;
  contentLanguage?: string;
  contentEncoding?: string;
  contentDisposition?: string;
  cacheControl?: string;
  storageTier?: string;
  metadata?: Record<string, string>;
};

export type PutObjectResult = {
  eTag: string;
  versionId: string;
  lastModified: Date;
  opcRequestId: string;
  opcClientRequestId: string;
  opcContentMd5: string;
  opcContentCrc32c: string;
  opcContentSha256: string;
  opcContentSha384: string;
};

export type GetObjectInput = OciObjectStorageLocation & {
  objectName: string;
  versionId?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
  opcClientRequestId?: string;
  range?: OciObjectStorageRange;
};

export type OciObjectSummary = {
  eTag: string;
  metadata: Record<string, string>;
  contentLength: number;
  contentType: string;
  contentLanguage: string;
  contentEncoding: string;
  cacheControl: string;
  contentDisposition: string;
  lastModified: Date;
  storageTier: string;
  archivalState: string;
  timeOfArchival: Date;
  versionId: string;
  contentMd5: string;
  multipartMd5: string;
  contentCrc32c: string;
  contentSha256: string;
  multipartSha256: string;
  contentSha384: string;
  multipartSha384: string;
};

export type GetObjectResult = OciObjectSummary & {
  body: Readable | ReadableStream | null;
  contentRange?: OciObjectStorageRange;
  expires: Date;
  isNotModified: boolean;
  opcRequestId: string;
  opcClientRequestId: string;
};

export type GetObjectBufferResult = OciObjectSummary & {
  body: Buffer | null;
  contentRange?: OciObjectStorageRange;
  expires: Date;
  isNotModified: boolean;
  opcRequestId: string;
  opcClientRequestId: string;
};

export type HeadObjectInput = OciObjectStorageLocation & {
  objectName: string;
  versionId?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
  opcClientRequestId?: string;
};

export type HeadObjectResult = OciObjectSummary & {
  isNotModified: boolean;
  opcRequestId: string;
  opcClientRequestId: string;
};

export type DeleteObjectInput = OciObjectStorageLocation & {
  objectName: string;
  versionId?: string;
  ifMatch?: string;
  opcClientRequestId?: string;
};

export type DeleteObjectResult = {
  lastModified: Date;
  versionId: string;
  isDeleteMarker: boolean;
  opcRequestId: string;
  opcClientRequestId: string;
};
