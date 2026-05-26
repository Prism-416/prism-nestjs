import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { PROJECT_REALTIME_EVENTS } from '@/modules/project/constants';
import {
  CommentCreatedPayloadDto,
  CommentDeletedPayloadDto,
  CommentUpdatedPayloadDto,
  DocumentCreatedPayloadDto,
  DocumentDeletedPayloadDto,
  ProjectDeletedPayloadDto,
  ProjectUpdatedPayloadDto,
  WorkItemCreatedPayloadDto,
  WorkItemDeletedPayloadDto,
  WorkItemsReorderedPayloadDto,
  WorkItemUpdatedPayloadDto,
} from '@/modules/project/dto';
import { buildProjectRoom } from '@/modules/project/utils';

@Injectable()
export class ProjectRealtimePublisherService {
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  publishProjectUpdated(payload: ProjectUpdatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.PROJECT_UPDATED,
      payload,
    );
  }

  publishProjectDeleted(payload: ProjectDeletedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.PROJECT_DELETED,
      payload,
    );
  }

  publishWorkItemCreated(payload: WorkItemCreatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.WORK_ITEM_CREATED,
      payload,
    );
  }

  publishWorkItemUpdated(payload: WorkItemUpdatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.WORK_ITEM_UPDATED,
      payload,
    );
  }

  publishWorkItemsReordered(payload: WorkItemsReorderedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.WORK_ITEMS_REORDERED,
      payload,
    );
  }

  publishWorkItemDeleted(payload: WorkItemDeletedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.WORK_ITEM_DELETED,
      payload,
    );
  }

  publishCommentCreated(payload: CommentCreatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.COMMENT_CREATED,
      payload,
    );
  }

  publishCommentUpdated(payload: CommentUpdatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.COMMENT_UPDATED,
      payload,
    );
  }

  publishCommentDeleted(payload: CommentDeletedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.COMMENT_DELETED,
      payload,
    );
  }

  publishDocumentCreated(payload: DocumentCreatedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.DOCUMENT_CREATED,
      payload,
    );
  }

  publishDocumentDeleted(payload: DocumentDeletedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.DOCUMENT_DELETED,
      payload,
    );
  }

  private emitToProject<TPayload>(
    projectId: string,
    event: string,
    payload: TPayload,
  ): void {
    this.server?.to(buildProjectRoom(projectId)).emit(event, payload);
  }
}
