import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
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
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly commentRepository: CommentRepository,
    private readonly uow: UnitOfWork,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
    private readonly notificationService: NotificationService,
  ) {}

  async createWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
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

      return { comment, notifications };
    });

    this.realtimePublisher.publishCommentCreated(result.comment);
    this.notificationService.publishNotifications(result.notifications);

    return result.comment;
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

      return { comment, notifications };
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

    return this.commentRepository.searchWorkItemComments({
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      itemId,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
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
