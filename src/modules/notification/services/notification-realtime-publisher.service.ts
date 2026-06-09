import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { NOTIFICATION_REALTIME_EVENTS } from '@/modules/notification/constants';
import {
  NotificationCreatedPayloadDto,
  WorkspaceAddedPayloadDto,
} from '@/modules/notification/dto';
import { buildNotificationUserRoom } from '@/modules/notification/utils';

@Injectable()
export class NotificationRealtimePublisherService {
  private static server?: Server;

  private readonly logger = new Logger(
    NotificationRealtimePublisherService.name,
  );

  bindServer(server: Server): void {
    NotificationRealtimePublisherService.server = server;
  }

  publishNotificationCreated(payload: NotificationCreatedPayloadDto): void {
    const server = NotificationRealtimePublisherService.server;
    if (!server) {
      this.logger.warn('Notification realtime server is not bound.');
      return;
    }

    server
      .to(buildNotificationUserRoom(payload.recipientUserId))
      .emit(NOTIFICATION_REALTIME_EVENTS.NOTIFICATION_CREATED, payload);
  }

  publishWorkspaceAdded(payload: WorkspaceAddedPayloadDto): void {
    const server = NotificationRealtimePublisherService.server;
    if (!server) {
      this.logger.warn('Notification realtime server is not bound.');
      return;
    }

    server
      .to(buildNotificationUserRoom(payload.recipientUserId))
      .emit(NOTIFICATION_REALTIME_EVENTS.WORKSPACE_ADDED, payload);
  }
}
