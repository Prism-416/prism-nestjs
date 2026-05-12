import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { OciObjectStorageService } from '@/core/object-storage';
import {
  DocumentSummaryResponseDto,
  SearchDocumentsQueryDto,
  SearchDocumentsResponseDto,
  UploadDocumentDto,
} from '@/modules/document/dto';
import {
  DocumentFileEmptyError,
  DocumentFileRequiredError,
  DocumentNotFoundError,
  DocumentProjectNotFoundError,
} from '@/modules/document/errors';
import { DocumentRepository } from '@/modules/document/repository';
import {
  DocumentDownloadResult,
  DocumentUploadFile,
} from '@/modules/document/types';
import {
  buildDocumentObjectName,
  sanitizeDocumentFileName,
} from '@/modules/document/utils';

@Injectable()
export class DocumentUseCase {
  private readonly logger = new Logger(DocumentUseCase.name);

  constructor(
    private readonly repo: DocumentRepository,
    private readonly objectStorageService: OciObjectStorageService,
  ) {}

  async searchDocuments(
    userId: string,
    projectId: string,
    query: SearchDocumentsQueryDto,
  ): Promise<SearchDocumentsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.repo.searchDocuments({
      projectId: project.projectId,
      query: query.query,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async getDocument(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<DocumentSummaryResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    const document = await this.repo.findDocumentById(
      project.projectId,
      documentId,
    );
    if (!document) {
      throw new DocumentNotFoundError();
    }

    return document;
  }

  async downloadDocument(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<DocumentDownloadResult> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    const document = await this.repo.findDocumentDownloadById(
      project.projectId,
      documentId,
    );
    if (!document) {
      throw new DocumentNotFoundError();
    }

    const object = await this.objectStorageService.getObject({
      objectName: document.storageObjectName,
      versionId: document.storageVersionId ?? undefined,
    });

    return {
      fileName: document.fileName,
      contentType: object.contentType || document.contentType,
      contentLength: object.contentLength || document.sizeBytes,
      eTag: object.eTag || document.storageETag || undefined,
      lastModified: object.lastModified,
      body: this.toReadable(object.body),
    };
  }

  async uploadDocument(
    userId: string,
    projectId: string,
    dto: UploadDocumentDto,
    file?: DocumentUploadFile,
  ): Promise<DocumentSummaryResponseDto> {
    if (!file) {
      throw new DocumentFileRequiredError();
    }

    if (file.size <= 0) {
      throw new DocumentFileEmptyError();
    }

    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    const documentId = randomUUID();
    const fileName = sanitizeDocumentFileName(file.originalname);
    const objectName = buildDocumentObjectName({
      projectId: project.projectId,
      documentId,
      fileName,
    });
    const contentType = file.mimetype || 'application/octet-stream';
    const putResult = await this.objectStorageService.putObject({
      objectName,
      body: file.buffer,
      contentLength: file.size,
      contentType,
      metadata: {
        projectId: project.projectId,
        documentId,
        uploadedBy: userId,
      },
    });

    try {
      return await this.repo.createDocument({
        documentId,
        projectId: project.projectId,
        title: dto.title ?? fileName,
        description: dto.description,
        fileName,
        contentType,
        sizeBytes: file.size,
        storageObjectName: objectName,
        storageETag: putResult.eTag,
        storageVersionId: putResult.versionId,
        createdBy: userId,
      });
    } catch (error) {
      await this.cleanupUploadedObject(objectName, putResult.versionId);
      throw error;
    }
  }

  private async cleanupUploadedObject(
    objectName: string,
    versionId?: string,
  ): Promise<void> {
    try {
      await this.objectStorageService.deleteObject({ objectName, versionId });
    } catch (cleanupError) {
      this.logger.warn(
        cleanupError instanceof Error
          ? cleanupError.message
          : 'Failed to cleanup uploaded document object.',
      );
    }
  }

  private toReadable(body: Readable | ReadableStream | null): Readable {
    if (!body) {
      throw new InternalServerErrorException('Document object body is empty.');
    }

    if (body instanceof Readable) {
      return body;
    }

    return Readable.fromWeb(body as NodeReadableStream<Uint8Array>);
  }
}
