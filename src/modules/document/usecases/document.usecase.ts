import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UnitOfWork } from '@/core/database';
import {
  ObjectStorageDeletionService,
  OciObjectStorageService,
} from '@/core/object-storage';
import { DOCUMENT_EMBEDDING_DIMENSIONS } from '@/modules/document/constants';
import {
  AppendDocumentChunkEmbeddingsDto,
  AppendDocumentChunkEmbeddingsResponseDto,
  AppendDocumentChunksDto,
  AppendDocumentChunksResponseDto,
  DocumentSummaryResponseDto,
  SearchDocumentsQueryDto,
  SearchDocumentsResponseDto,
  UploadDocumentDto,
} from '@/modules/document/dto';
import {
  DocumentChunkContentHashConflictError,
  DocumentChunkEmbeddingDuplicateTargetError,
  DocumentChunkEmbeddingTargetMismatchError,
  DocumentChunkDuplicateContentHashError,
  DocumentChunkDuplicateIndexError,
  DocumentCommentNotFoundError,
  DocumentCommentWorkItemRequiredError,
  DocumentFileEmptyError,
  DocumentFileRequiredError,
  DocumentForbiddenError,
  DocumentNotFoundError,
  DocumentProjectNotFoundError,
  DocumentWorkItemNotFoundError,
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
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import type { WorkspaceMemberRole } from '@/modules/workspace/constants';

@Injectable()
export class DocumentUseCase {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly objectStorageService: OciObjectStorageService,
    private readonly objectStorageDeletionService: ObjectStorageDeletionService,
    private readonly uow: UnitOfWork,
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

    const params = {
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      query: query.query,
      workItemId: query.workItemId,
      source: query.source,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    };
    const [result, groups] = await Promise.all([
      this.repo.searchDocuments(params),
      this.repo.searchDocumentGroups(params),
    ]);

    return { ...result, groups };
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
      project.workspaceId,
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
    this.assertCanContribute(project.role);

    const ref = await this.repo.findDocumentDownloadRef(
      project.workspaceId,
      project.projectId,
      documentId,
    );
    if (!ref) {
      throw new DocumentNotFoundError();
    }

    const object = await this.objectStorageService.getObjectBuffer({
      objectName: ref.storageObjectName,
      versionId: ref.storageVersionId ?? undefined,
    });
    if (!object.body) {
      throw new DocumentNotFoundError();
    }

    return {
      fileName: ref.fileName,
      contentType: ref.contentType,
      sizeBytes: ref.sizeBytes,
      body: object.body,
    };
  }

  async appendDocumentChunks(
    userId: string,
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunksDto,
  ): Promise<AppendDocumentChunksResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.appendProjectDocumentChunks(
      project.workspaceId,
      project.projectId,
      documentId,
      dto,
    );
  }

  async appendDocumentChunksForInternal(
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunksDto,
  ): Promise<AppendDocumentChunksResponseDto> {
    const project = await this.repo.findProjectById(projectId);
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.appendProjectDocumentChunks(
      project.workspaceId,
      project.projectId,
      documentId,
      dto,
    );
  }

  private async appendProjectDocumentChunks(
    workspaceId: string,
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunksDto,
  ): Promise<AppendDocumentChunksResponseDto> {
    const document = await this.repo.findDocumentById(
      workspaceId,
      projectId,
      documentId,
    );
    if (!document) {
      throw new DocumentNotFoundError();
    }

    this.assertUniqueChunkIndexes(dto);
    this.assertUniqueContentHashes(dto);

    try {
      const items = await this.repo.upsertDocumentChunks({
        workspaceId,
        projectId,
        documentId: document.documentId,
        chunks: dto.chunks,
      });

      return {
        items,
        count: items.length,
      };
    } catch (error) {
      if (this.isUniqueViolation(error, 'uq_document_chunks_hash')) {
        throw new DocumentChunkContentHashConflictError();
      }

      throw error;
    }
  }

  async appendDocumentChunkEmbeddings(
    userId: string,
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunkEmbeddingsDto,
  ): Promise<AppendDocumentChunkEmbeddingsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.appendProjectDocumentChunkEmbeddings(
      project.workspaceId,
      project.projectId,
      documentId,
      dto,
    );
  }

  async appendDocumentChunkEmbeddingsForInternal(
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunkEmbeddingsDto,
  ): Promise<AppendDocumentChunkEmbeddingsResponseDto> {
    const project = await this.repo.findProjectById(projectId);
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.appendProjectDocumentChunkEmbeddings(
      project.workspaceId,
      project.projectId,
      documentId,
      dto,
    );
  }

  private async appendProjectDocumentChunkEmbeddings(
    workspaceId: string,
    projectId: string,
    documentId: string,
    dto: AppendDocumentChunkEmbeddingsDto,
  ): Promise<AppendDocumentChunkEmbeddingsResponseDto> {
    const document = await this.repo.findDocumentById(
      workspaceId,
      projectId,
      documentId,
    );
    if (!document) {
      throw new DocumentNotFoundError();
    }

    this.assertUniqueEmbeddingChunkIds(dto);

    const items = await this.repo.upsertDocumentChunkEmbeddings({
      workspaceId,
      projectId,
      documentId: document.documentId,
      embeddings: dto.embeddings.map((embedding) => ({
        ...embedding,
        dimensions: embedding.dimensions ?? DOCUMENT_EMBEDDING_DIMENSIONS,
      })),
    });

    if (items.length !== dto.embeddings.length) {
      throw new DocumentChunkEmbeddingTargetMismatchError();
    }

    return {
      items,
      count: items.length,
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
    this.assertCanContribute(project.role);

    let sourceWorkItemTitleSnapshot: string | null = null;

    if (dto.workItemId) {
      sourceWorkItemTitleSnapshot = await this.repo.findWorkItemTitle(
        project.workspaceId,
        project.projectId,
        dto.workItemId,
      );
      if (!sourceWorkItemTitleSnapshot) {
        throw new DocumentWorkItemNotFoundError();
      }
    }

    // A comment association only makes sense within its work item.
    if (dto.commentId) {
      if (!dto.workItemId) {
        throw new DocumentCommentWorkItemRequiredError();
      }

      const commentExists = await this.repo.commentExistsForWorkItem(
        project.workspaceId,
        project.projectId,
        dto.workItemId,
        dto.commentId,
        userId,
      );
      if (!commentExists) {
        throw new DocumentCommentNotFoundError();
      }
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
        workspaceId: project.workspaceId,
        projectId: project.projectId,
        title: dto.title ?? fileName,
        description: dto.description,
        fileName,
        contentType,
        sizeBytes: file.size,
        storageObjectName: objectName,
        storageETag: putResult.eTag,
        storageVersionId: putResult.versionId,
        sourceKind: dto.workItemId ? 'work_item' : 'direct',
        sourceWorkItemId: dto.workItemId ?? null,
        sourceWorkItemIdSnapshot: dto.workItemId ?? null,
        sourceWorkItemTitleSnapshot,
        sourceCommentId: dto.commentId ?? null,
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
    const result = await this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new DocumentProjectNotFoundError();
      }

      const document = await this.repo.findDocumentById(
        project.workspaceId,
        project.projectId,
        documentId,
        manager,
      );
      if (!document) {
        throw new DocumentNotFoundError();
      }

      const canDeleteDocument =
        this.canManage(project.role) ||
        (document.sourceCommentId !== null && document.createdBy === userId);
      if (!canDeleteDocument) {
        throw new DocumentForbiddenError();
      }

      const deletedDocument = await this.repo.deleteDocument(
        project.workspaceId,
        project.projectId,
        document.documentId,
        manager,
      );
      if (!deletedDocument) {
        throw new DocumentNotFoundError();
      }

      const deletionId = await this.objectStorageDeletionService.enqueue(
        {
          objectName: deletedDocument.storageObjectName,
          storageVersionId: deletedDocument.storageVersionId ?? undefined,
          reason: 'document_deleted',
        },
        manager,
      );

      return { projectId: project.projectId, deletionId };
    });

    if (result.deletionId) {
      await this.objectStorageDeletionService.processDeletion(
        result.deletionId,
      );
    }

    this.realtimePublisher.publishDocumentDeleted({
      projectId: result.projectId,
      documentId,
    });
  }

  private async cleanupObject(
    objectName: string,
    versionId: string | undefined,
    fallbackMessage: string,
  ): Promise<void> {
    await this.objectStorageDeletionService.enqueueAndProcess({
      objectName,
      storageVersionId: versionId,
      reason: fallbackMessage,
    });
  }

  private assertCanContribute(role: WorkspaceMemberRole): void {
    if (role === 'viewer') {
      throw new DocumentForbiddenError();
    }
  }

  private assertCanManage(role: WorkspaceMemberRole): void {
    if (!this.canManage(role)) {
      throw new DocumentForbiddenError();
    }
  }

  private canManage(role: WorkspaceMemberRole): boolean {
    return role === 'owner' || role === 'admin';
  }

  private assertUniqueChunkIndexes(dto: AppendDocumentChunksDto): void {
    const seenChunkIndexes = new Set<number>();
    for (const chunk of dto.chunks) {
      if (seenChunkIndexes.has(chunk.chunkIndex)) {
        throw new DocumentChunkDuplicateIndexError();
      }

      seenChunkIndexes.add(chunk.chunkIndex);
    }
  }

  private assertUniqueContentHashes(dto: AppendDocumentChunksDto): void {
    const seenContentHashes = new Set<string>();
    for (const chunk of dto.chunks) {
      if (seenContentHashes.has(chunk.contentHash)) {
        throw new DocumentChunkDuplicateContentHashError();
      }

      seenContentHashes.add(chunk.contentHash);
    }
  }

  private assertUniqueEmbeddingChunkIds(
    dto: AppendDocumentChunkEmbeddingsDto,
  ): void {
    const seenChunkIds = new Set<string>();
    for (const embedding of dto.embeddings) {
      const chunkId = embedding.chunkId.toLowerCase();
      if (seenChunkIds.has(chunkId)) {
        throw new DocumentChunkEmbeddingDuplicateTargetError();
      }

      seenChunkIds.add(chunkId);
    }
  }

  private isUniqueViolation(error: unknown, constraint: string): boolean {
    const driverError = (error as { driverError?: unknown }).driverError as
      | { code?: string; constraint?: string }
      | undefined;

    return (
      driverError?.code === '23505' && driverError.constraint === constraint
    );
  }
}
