import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { PROJECT_REALTIME_EVENTS } from '@/modules/project/constants';
import {
  ProjectDeletedPayloadDto,
  ProjectUpdatedPayloadDto,
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

  private emitToProject<TPayload>(
    projectId: string,
    event: string,
    payload: TPayload,
  ): void {
    this.server?.to(buildProjectRoom(projectId)).emit(event, payload);
  }
}
