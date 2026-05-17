import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import { DocumentUploadFile } from '@/modules/document/types';
import {
  buildDocumentObjectName,
  sanitizeDocumentFileName,
} from '@/modules/document/utils';
import { ProjectRealtimePublisherService } from '@/modules/project/services';

@Injectable()
export class DocumentUseCase {
  private readonly logger = new Logger(DocumentUseCase.name);

  constructor(
    private readonly repo: DocumentRepository,
    private readonly objectStorageService: OciObjectStorageService,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
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

    let document: DocumentSummaryResponseDto;

    try {
      document = await this.repo.createDocument({
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
      await this.cleanupObject(
        objectName,
        putResult.versionId,
        'Failed to cleanup uploaded document object.',
      );
      throw error;
    }

    this.realtimePublisher.publishDocumentCreated(document);

    return document;
  }

  async deleteDocument(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<void> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    const deletedDocument = await this.repo.deleteDocument(
      project.projectId,
      documentId,
    );
    if (!deletedDocument) {
      throw new DocumentNotFoundError();
    }

    await this.cleanupObject(
      deletedDocument.storageObjectName,
      deletedDocument.storageVersionId ?? undefined,
      'Failed to cleanup deleted document object.',
    );

    this.realtimePublisher.publishDocumentDeleted({
      projectId: project.projectId,
      documentId,
    });
  }

  private async cleanupObject(
    objectName: string,
    versionId: string | undefined,
    fallbackMessage: string,
  ): Promise<void> {
    try {
      await this.objectStorageService.deleteObject({ objectName, versionId });
    } catch (cleanupError) {
      this.logger.warn(
        cleanupError instanceof Error ? cleanupError.message : fallbackMessage,
      );
    }
  }
}
