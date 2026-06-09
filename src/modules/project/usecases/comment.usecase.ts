import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import {
  ObjectStorageDeletionService,
  OciObjectStorageService,
} from '@/core/object-storage';
import {
  DocumentAttachmentUploadFailedError,
  DocumentFileEmptyError,
  DocumentForbiddenError,
} from '@/modules/document/errors';
import { DocumentRepository } from '@/modules/document/repository';
import { DocumentRow, DocumentUploadFile } from '@/modules/document/types';
import {
  buildDocumentObjectName,
  sanitizeDocumentFileName,
} from '@/modules/document/utils';
import { PROJECT_EMBEDDING_DIMENSIONS } from '@/modules/project/constants';
import {
  CommentResponseDto,
  CreateCommentDto,
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
  UpsertWorkItemCommentEmbeddingDto,
  WorkItemCommentEmbeddingResponseDto,
} from '@/modules/project/dto';
import {
  CommentEmbeddingTargetMismatchError,
  CommentNotFoundError,
  ProjectNotFoundError,
  WorkItemNotFoundError,
} from '@/modules/project/errors';
import {
  CommentRepository,
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import { extractMentionUsernames } from '@/modules/project/utils';
import { NotificationService } from '@/modules/notification/services';
import { NotificationRow } from '@/modules/notification/types';

@Injectable()
export class CommentUseCase {
  private readonly logger = new Logger(CommentUseCase.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly commentRepository: CommentRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly objectStorageService: OciObjectStorageService,
    private readonly objectStorageDeletionService: ObjectStorageDeletionService,
    private readonly uow: UnitOfWork,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
    private readonly notificationService: NotificationService,
  ) {}

  async createWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
    dto: CreateCommentDto,
    files: DocumentUploadFile[] = [],
  ): Promise<CommentResponseDto> {
    const uploadedObjects: Array<{ objectName: string; versionId?: string }> =
      [];

    try {
      const result = await this.uow.run(async (manager) => {
        const project =
          await this.projectRepository.findProjectByIdAndMemberUserId(
            projectId,
            userId,
            manager,
          );
        if (!project) {
          throw new ProjectNotFoundError();
        }

        if (files.length > 0) {
          const documentProject =
            await this.documentRepository.findProjectByIdAndMemberUserId(
              project.projectId,
              userId,
              manager,
            );
          if (!documentProject || documentProject.role === 'viewer') {
            throw new DocumentForbiddenError();
          }
        }

        const workItem = await this.workItemRepository.findWorkItemRecordById(
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );
        if (!workItem) {
          throw new WorkItemNotFoundError();
        }

        const comment = await this.commentRepository.createWorkItemComment(
          {
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            itemId,
            authorUserId: userId,
            body: dto.body,
          },
          manager,
        );

        const documents = await this.createCommentAttachments(
          {
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            itemId,
            workItemTitle: workItem.title,
            commentId: comment.commentId,
            userId,
            files,
            uploadedObjects,
          },
          manager,
        );

        const notifications = await this.dispatchMentionNotifications(
          {
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            itemId,
            commentId: comment.commentId,
            commentBody: comment.body,
            authorUserId: userId,
          },
          manager,
        );

        return {
          comment: {
            ...comment,
            attachments: documents,
          },
          documents,
          notifications,
        };
      });

      this.realtimePublisher.publishCommentCreated(result.comment);
      for (const document of result.documents) {
        this.realtimePublisher.publishDocumentCreated(document);
      }
      this.notificationService.publishNotifications(result.notifications);

      return result.comment;
    } catch (error) {
      await Promise.all(
        uploadedObjects.map((object) =>
          this.cleanupObject(
            object.objectName,
            object.versionId,
            'Failed to cleanup uploaded comment attachment object.',
          ),
        ),
      );
      throw error;
    }
  }

  async updateWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
    commentId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const result = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const workItem = await this.workItemRepository.findWorkItemById(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );
      if (!workItem) {
        throw new WorkItemNotFoundError();
      }

      const comment = await this.commentRepository.updateWorkItemComment(
        {
          workspaceId: project.workspaceId,
          projectId: project.projectId,
          itemId,
          commentId,
          authorUserId: userId,
          body: dto.body,
        },
        manager,
      );
      if (!comment) {
        throw new CommentNotFoundError();
      }

      const notifications = await this.dispatchMentionNotifications(
        {
          workspaceId: project.workspaceId,
          projectId: project.projectId,
          itemId,
          commentId: comment.commentId,
          commentBody: comment.body,
          authorUserId: userId,
        },
        manager,
      );

      const attachments =
        await this.documentRepository.findDocumentsByCommentIds(
          project.workspaceId,
          project.projectId,
          [comment.commentId],
          manager,
        );

      return {
        comment: {
          ...comment,
          attachments,
        },
        notifications,
      };
    });

    this.realtimePublisher.publishCommentUpdated(result.comment);
    this.notificationService.publishNotifications(result.notifications);

    return result.comment;
  }

  async deleteWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
    commentId: string,
  ): Promise<void> {
    const deletedComment = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const workItem = await this.workItemRepository.findWorkItemById(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );
      if (!workItem) {
        throw new WorkItemNotFoundError();
      }

      const deleted = await this.commentRepository.deleteWorkItemComment(
        {
          workspaceId: project.workspaceId,
          projectId: project.projectId,
          itemId,
          commentId,
          authorUserId: userId,
        },
        manager,
      );
      if (!deleted) {
        throw new CommentNotFoundError();
      }

      return {
        projectId: project.projectId,
        itemId,
        commentId,
      };
    });

    this.realtimePublisher.publishCommentDeleted(deletedComment);
  }

  async searchWorkItemComments(
    userId: string,
    projectId: string,
    itemId: string,
    query: SearchCommentsQueryDto,
  ): Promise<SearchCommentsResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const workItem = await this.workItemRepository.findWorkItemById(
      project.workspaceId,
      project.projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    const result = await this.commentRepository.searchWorkItemComments({
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      itemId,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    const documents = await this.documentRepository.findDocumentsByCommentIds(
      project.workspaceId,
      project.projectId,
      result.comments.map((comment) => comment.commentId),
    );
    const attachmentsByCommentId = new Map<string, DocumentRow[]>();
    for (const document of documents) {
      if (!document.sourceCommentId) {
        continue;
      }

      const existing = attachmentsByCommentId.get(document.sourceCommentId);
      if (existing) {
        existing.push(document);
      } else {
        attachmentsByCommentId.set(document.sourceCommentId, [document]);
      }
    }

    return {
      ...result,
      comments: result.comments.map((comment) => ({
        ...comment,
        attachments: attachmentsByCommentId.get(comment.commentId) ?? [],
      })),
    };
  }

  async upsertWorkItemCommentEmbedding(
    userId: string,
    projectId: string,
    itemId: string,
    commentId: string,
    dto: UpsertWorkItemCommentEmbeddingDto,
  ): Promise<WorkItemCommentEmbeddingResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.upsertProjectWorkItemCommentEmbedding(
      project.workspaceId,
      project.projectId,
      itemId,
      commentId,
      dto,
    );
  }

  async upsertWorkItemCommentEmbeddingForInternal(
    projectId: string,
    itemId: string,
    commentId: string,
    dto: UpsertWorkItemCommentEmbeddingDto,
  ): Promise<WorkItemCommentEmbeddingResponseDto> {
    const project = await this.projectRepository.findProjectById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.upsertProjectWorkItemCommentEmbedding(
      project.workspaceId,
      project.projectId,
      itemId,
      commentId,
      dto,
    );
  }

  private async upsertProjectWorkItemCommentEmbedding(
    workspaceId: string,
    projectId: string,
    itemId: string,
    commentId: string,
    dto: UpsertWorkItemCommentEmbeddingDto,
  ): Promise<WorkItemCommentEmbeddingResponseDto> {
    const workItem = await this.workItemRepository.findWorkItemById(
      workspaceId,
      projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    const comment = await this.commentRepository.findWorkItemCommentById(
      workspaceId,
      projectId,
      itemId,
      commentId,
    );
    if (!comment) {
      throw new CommentNotFoundError();
    }

    const embedding =
      await this.commentRepository.upsertWorkItemCommentEmbedding({
        workspaceId,
        projectId,
        itemId,
        commentId,
        embeddedBody: dto.embeddedBody,
        contentHash: dto.contentHash,
        model: dto.model,
        dimensions: dto.dimensions ?? PROJECT_EMBEDDING_DIMENSIONS,
        embedding: dto.embedding,
      });
    if (!embedding) {
      throw new CommentEmbeddingTargetMismatchError();
    }

    return embedding;
  }

  private async createCommentAttachments(
    params: {
      workspaceId: string;
      projectId: string;
      itemId: string;
      workItemTitle: string;
      commentId: string;
      userId: string;
      files: DocumentUploadFile[];
      uploadedObjects: Array<{ objectName: string; versionId?: string }>;
    },
    manager: EntityManager,
  ): Promise<DocumentRow[]> {
    const documents: DocumentRow[] = [];

    for (const file of params.files) {
      if (file.size <= 0) {
        throw new DocumentFileEmptyError();
      }

      const documentId = randomUUID();
      const fileName = sanitizeDocumentFileName(file.originalname);
      const objectName = buildDocumentObjectName({
        projectId: params.projectId,
        documentId,
        fileName,
      });
      const contentType = file.mimetype || 'application/octet-stream';

      try {
        const putResult = await this.objectStorageService.putObject({
          bucketKind: 'documents',
          objectName,
          body: file.buffer,
          contentLength: file.size,
          contentType,
          metadata: {
            projectId: params.projectId,
            documentId,
            itemId: params.itemId,
            commentId: params.commentId,
            uploadedBy: params.userId,
          },
        });

        params.uploadedObjects.push({
          objectName,
          versionId: putResult.versionId,
        });

        const document = await this.documentRepository.createDocument(
          {
            documentId,
            workspaceId: params.workspaceId,
            projectId: params.projectId,
            title: fileName,
            fileName,
            contentType,
            sizeBytes: file.size,
            storageObjectName: objectName,
            storageETag: putResult.eTag,
            storageVersionId: putResult.versionId,
            sourceKind: 'work_item',
            sourceWorkItemId: params.itemId,
            sourceWorkItemIdSnapshot: params.itemId,
            sourceWorkItemTitleSnapshot: params.workItemTitle,
            sourceCommentId: params.commentId,
            createdBy: params.userId,
          },
          manager,
        );

        documents.push(document);
      } catch (error) {
        this.logger.warn(
          error instanceof Error
            ? error.message
            : 'Comment attachment could not be uploaded.',
        );
        throw new DocumentAttachmentUploadFailedError();
      }
    }

    return documents;
  }

  private async cleanupObject(
    objectName: string,
    versionId: string | undefined,
    fallbackMessage: string,
  ): Promise<void> {
    await this.objectStorageDeletionService.enqueueAndProcess({
      bucketKind: 'documents',
      objectName,
      storageVersionId: versionId,
      reason: fallbackMessage,
    });
  }

  private async dispatchMentionNotifications(
    params: {
      workspaceId: string;
      projectId: string;
      itemId: string;
      commentId: string;
      commentBody: string;
      authorUserId: string;
    },
    manager: EntityManager,
  ): Promise<NotificationRow[]> {
    const mentionedUsers =
      await this.commentRepository.replaceWorkItemCommentMentions(
        {
          workspaceId: params.workspaceId,
          commentId: params.commentId,
          authorUserId: params.authorUserId,
          usernames: extractMentionUsernames(params.commentBody),
        },
        manager,
      );

    return this.notificationService.createWorkItemCommentMentionNotifications(
      {
        recipientUserIds: mentionedUsers.map(
          (mentionedUser) => mentionedUser.userId,
        ),
        actorUserId: params.authorUserId,
        workspaceId: params.workspaceId,
        projectId: params.projectId,
        itemId: params.itemId,
        commentId: params.commentId,
        commentBody: params.commentBody,
      },
      manager,
    );
  }
}
