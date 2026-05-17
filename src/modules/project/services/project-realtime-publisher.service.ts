import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { PROJECT_REALTIME_EVENTS } from '@/modules/project/constants';
import {
  ProjectDeletedPayloadDto,
  ProjectUpdatedPayloadDto,
  WorkItemCreatedPayloadDto,
  WorkItemDeletedPayloadDto,
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

  publishWorkItemDeleted(payload: WorkItemDeletedPayloadDto): void {
    this.emitToProject(
      payload.projectId,
      PROJECT_REALTIME_EVENTS.WORK_ITEM_DELETED,
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
