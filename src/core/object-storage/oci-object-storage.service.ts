import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import * as common from 'oci-common';
import * as objectStorage from 'oci-objectstorage';
import {
  buildOciAuthenticationDetailsProvider,
  readOciAuthenticationConfig,
} from '@/core/oci';
import {
  DeleteObjectInput,
  DeleteObjectResult,
  GetObjectBufferResult,
  GetObjectInput,
  GetObjectResult,
  HeadObjectInput,
  HeadObjectResult,
  OciObjectStorageBody,
  OciObjectStorageRange,
  OciObjectSummary,
  PutObjectInput,
  PutObjectResult,
} from '@/core/object-storage/oci-object-storage.types';

type ObjectLocation = {
  namespaceName: string;
  bucketName: string;
};

@Injectable()
export class OciObjectStorageService {
  private readonly logger = new Logger(OciObjectStorageService.name);
  private readonly enabled =
    (this.getEnv('OBJECT_STORAGE_ENABLED') ?? 'false').toLowerCase() === 'true';
  private readonly ociConfig = readOciAuthenticationConfig((key) =>
    this.getEnv(key),
  );
  private readonly authMode = this.ociConfig.authMode;
  private readonly regionId = this.ociConfig.regionId;
  private readonly defaultNamespaceName =
    this.getEnv('OCI_OBJECT_STORAGE_NAMESPACE') ?? '';
  private readonly defaultBucketName =
    this.getEnv('OCI_OBJECT_STORAGE_BUCKET_NAME') ?? '';

  private client?: objectStorage.ObjectStorageClient;
  private clientPromise?: Promise<objectStorage.ObjectStorageClient>;
  private namespaceName?: string;
  private namespacePromise?: Promise<string>;

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    this.ensureEnabled();
    const location = await this.resolveLocation(input);

    if (!input.objectName) {
      throw new InternalServerErrorException('Object name is required.');
    }

    try {
      const client = await this.getClient();
      const response = await client.putObject({
        namespaceName: location.namespaceName,
        bucketName: location.bucketName,
        objectName: input.objectName,
        putObjectBody: input.body,
        contentLength: this.resolveContentLength(
          input.body,
          input.contentLength,
        ),
        ifMatch: input.ifMatch,
        ifNoneMatch: input.ifNoneMatch,
        opcClientRequestId: input.opcClientRequestId,
        contentMD5: input.contentMD5,
        contentType: input.contentType,
        contentLanguage: input.contentLanguage,
        contentEncoding: input.contentEncoding,
        contentDisposition: input.contentDisposition,
        cacheControl: input.cacheControl,
        storageTier: input.storageTier as objectStorage.models.StorageTier,
        opcMeta: input.metadata,
      });

      return {
        eTag: response.eTag,
        versionId: response.versionId,
        lastModified: response.lastModified,
        opcRequestId: response.opcRequestId,
        opcClientRequestId: response.opcClientRequestId,
        opcContentMd5: response.opcContentMd5,
        opcContentCrc32c: response.opcContentCrc32c,
        opcContentSha256: response.opcContentSha256,
        opcContentSha384: response.opcContentSha384,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        this.formatObjectStorageFailureMessage(
          err,
          location.bucketName,
          input.objectName,
        ),
      );
      throw new InternalServerErrorException('Failed to put object.');
    }
  }

  async getObject(input: GetObjectInput): Promise<GetObjectResult> {
    this.ensureEnabled();
    const location = await this.resolveLocation(input);

    if (!input.objectName) {
      throw new InternalServerErrorException('Object name is required.');
    }

    try {
      const client = await this.getClient();
      const response = await client.getObject({
        namespaceName: location.namespaceName,
        bucketName: location.bucketName,
        objectName: input.objectName,
        versionId: input.versionId,
        ifMatch: input.ifMatch,
        ifNoneMatch: input.ifNoneMatch,
        opcClientRequestId: input.opcClientRequestId,
        range: this.mapRequestRange(input.range),
      });

      return {
        ...this.mapObjectSummary(response),
        body: response.value,
        contentRange: this.mapRange(response.contentRange),
        expires: response.expires,
        isNotModified: response.isNotModified,
        opcRequestId: response.opcRequestId,
        opcClientRequestId: response.opcClientRequestId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        this.formatObjectStorageFailureMessage(
          err,
          location.bucketName,
          input.objectName,
        ),
      );
      throw new InternalServerErrorException('Failed to get object.');
    }
  }

  async getObjectBuffer(input: GetObjectInput): Promise<GetObjectBufferResult> {
    const result = await this.getObject(input);

    return {
      ...result,
      body: await this.readBodyToBuffer(result.body),
    };
  }

  async headObject(input: HeadObjectInput): Promise<HeadObjectResult> {
    this.ensureEnabled();
    const location = await this.resolveLocation(input);

    if (!input.objectName) {
      throw new InternalServerErrorException('Object name is required.');
    }

    try {
      const client = await this.getClient();
      const response = await client.headObject({
        namespaceName: location.namespaceName,
        bucketName: location.bucketName,
        objectName: input.objectName,
        versionId: input.versionId,
        ifMatch: input.ifMatch,
        ifNoneMatch: input.ifNoneMatch,
        opcClientRequestId: input.opcClientRequestId,
      });

      return {
        ...this.mapObjectSummary(response),
        isNotModified: response.isNotModified,
        opcRequestId: response.opcRequestId,
        opcClientRequestId: response.opcClientRequestId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        this.formatObjectStorageFailureMessage(
          err,
          location.bucketName,
          input.objectName,
        ),
      );
      throw new InternalServerErrorException('Failed to head object.');
    }
  }

  async deleteObject(input: DeleteObjectInput): Promise<DeleteObjectResult> {
    this.ensureEnabled();
    const location = await this.resolveLocation(input);

    if (!input.objectName) {
      throw new InternalServerErrorException('Object name is required.');
    }

    try {
      const client = await this.getClient();
      const response = await client.deleteObject({
        namespaceName: location.namespaceName,
        bucketName: location.bucketName,
        objectName: input.objectName,
        versionId: input.versionId,
        ifMatch: input.ifMatch,
        opcClientRequestId: input.opcClientRequestId,
      });

      return {
        lastModified: response.lastModified,
        versionId: response.versionId,
        isDeleteMarker: response.isDeleteMarker,
        opcRequestId: response.opcRequestId,
        opcClientRequestId: response.opcClientRequestId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        this.formatObjectStorageFailureMessage(
          err,
          location.bucketName,
          input.objectName,
        ),
      );
      throw new InternalServerErrorException('Failed to delete object.');
    }
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'OCI object storage is disabled. Set OBJECT_STORAGE_ENABLED=true.',
      );
    }
  }

  private async resolveLocation(input: {
    namespaceName?: string;
    bucketName?: string;
  }): Promise<ObjectLocation> {
    const bucketName = input.bucketName ?? this.defaultBucketName;
    if (!bucketName) {
      throw new InternalServerErrorException(
        'Bucket name is required. Set OCI_OBJECT_STORAGE_BUCKET_NAME or provide bucketName.',
      );
    }

    const namespaceName =
      input.namespaceName ?? (await this.getNamespaceName());

    return {
      namespaceName,
      bucketName,
    };
  }

  private async getNamespaceName(): Promise<string> {
    if (this.defaultNamespaceName) {
      return this.defaultNamespaceName;
    }

    if (this.namespaceName) {
      return this.namespaceName;
    }

    if (this.namespacePromise) {
      return this.namespacePromise;
    }

    this.namespacePromise = this.fetchNamespaceName();
    try {
      this.namespaceName = await this.namespacePromise;
      return this.namespaceName;
    } finally {
      this.namespacePromise = undefined;
    }
  }

  private async fetchNamespaceName(): Promise<string> {
    const client = await this.getClient();
    const response = await client.getNamespace({});

    if (!response.value) {
      throw new InternalServerErrorException(
        'Failed to resolve OCI object storage namespace.',
      );
    }

    return response.value;
  }

  private async getClient(): Promise<objectStorage.ObjectStorageClient> {
    if (this.client) {
      return this.client;
    }

    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = this.buildClient();
    try {
      this.client = await this.clientPromise;
      return this.client;
    } finally {
      this.clientPromise = undefined;
    }
  }

  private async buildClient(): Promise<objectStorage.ObjectStorageClient> {
    if (!this.regionId) {
      throw new InternalServerErrorException(
        'Missing OCI object storage configuration: OCI_REGION',
      );
    }

    const authenticationDetailsProvider =
      await this.buildAuthenticationProvider();
    const client = new objectStorage.ObjectStorageClient({
      authenticationDetailsProvider,
    });
    client.regionId = this.regionId;
    return client;
  }

  private async buildAuthenticationProvider() {
    return buildOciAuthenticationDetailsProvider(
      this.ociConfig,
      'OCI object storage',
    );
  }

  private resolveContentLength(
    body: OciObjectStorageBody,
    contentLength: number | undefined,
  ): number | undefined {
    if (typeof contentLength === 'number') {
      return contentLength;
    }

    if (typeof body === 'string') {
      return Buffer.byteLength(body);
    }

    if (Buffer.isBuffer(body)) {
      return body.byteLength;
    }

    if (body instanceof Uint8Array) {
      return body.byteLength;
    }

    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      return body.size;
    }

    return undefined;
  }

  private mapRequestRange(
    range: OciObjectStorageRange | undefined,
  ): common.Range | undefined {
    if (!range) {
      return undefined;
    }

    return new common.Range(
      range.startByte ?? null,
      range.endByte ?? null,
      null,
    );
  }

  private mapRange(
    range: common.Range | undefined,
  ): OciObjectStorageRange | undefined {
    if (!range) {
      return undefined;
    }

    return {
      startByte: range.startByte ?? undefined,
      endByte: range.endByte ?? undefined,
      contentLength: range.contentLength ?? undefined,
    };
  }

  private mapObjectSummary(response: {
    eTag: string;
    opcMeta: Record<string, string>;
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
    opcMultipartMd5: string;
    opcContentCrc32c: string;
    opcContentSha256: string;
    opcMultipartSha256: string;
    opcContentSha384: string;
    opcMultipartSha384: string;
  }): OciObjectSummary {
    return {
      eTag: response.eTag,
      metadata: response.opcMeta,
      contentLength: response.contentLength,
      contentType: response.contentType,
      contentLanguage: response.contentLanguage,
      contentEncoding: response.contentEncoding,
      cacheControl: response.cacheControl,
      contentDisposition: response.contentDisposition,
      lastModified: response.lastModified,
      storageTier: response.storageTier,
      archivalState: response.archivalState,
      timeOfArchival: response.timeOfArchival,
      versionId: response.versionId,
      contentMd5: response.contentMd5,
      multipartMd5: response.opcMultipartMd5,
      contentCrc32c: response.opcContentCrc32c,
      contentSha256: response.opcContentSha256,
      multipartSha256: response.opcMultipartSha256,
      contentSha384: response.opcContentSha384,
      multipartSha384: response.opcMultipartSha384,
    };
  }

  private async readBodyToBuffer(
    body: Readable | ReadableStream | null,
  ): Promise<Buffer | null> {
    if (!body) {
      return null;
    }

    const chunks: Buffer[] = [];

    if (body instanceof Readable) {
      for await (const chunk of body) {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
          continue;
        }

        if (Buffer.isBuffer(chunk)) {
          chunks.push(Buffer.from(chunk));
          continue;
        }

        if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk));
          continue;
        }

        throw new InternalServerErrorException(
          'Unsupported object stream chunk type.',
        );
      }

      return Buffer.concat(chunks);
    }

    const webStream = body as ReadableStream<Uint8Array>;
    const reader = webStream.getReader();
    try {
      while (true) {
        const result: ReadableStreamReadResult<Uint8Array> =
          await reader.read();
        if (result.done) {
          break;
        }

        chunks.push(Buffer.from(result.value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  private getEnv(key: string): string | undefined {
    return process.env[key];
  }

  private formatObjectStorageFailureMessage(
    error: Error,
    bucketName: string,
    objectName: string,
  ): string {
    const hints: string[] = [];

    if (this.authMode === 'instance_principal') {
      hints.push(
        'verify the app runs on an OCI compute instance',
        'verify the instance belongs to a dynamic group',
        'verify the dynamic group can manage objects in the target bucket',
      );
    }

    if (
      error.message.includes('Authorization failed') ||
      error.message.includes('not authorized or not found')
    ) {
      hints.push(
        'verify OCI_REGION matches the bucket region',
        'verify the bucket and namespace exist',
        'verify the principal can access that bucket and object',
      );
    }

    if (hints.length === 0) {
      return `OCI object storage operation failed: bucket=${bucketName}, object=${objectName}, error=${error.message}`;
    }

    return `OCI object storage operation failed: bucket=${bucketName}, object=${objectName}, error=${error.message}. Check: ${hints.join('; ')}.`;
  }
}
