import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CreateMentionNotificationsParams,
  NotificationRow,
} from '@/modules/notification/types';
import { NotificationRepository } from '@/modules/notification/repository';
import { NotificationRealtimePublisherService } from '@/modules/notification/services/notification-realtime-publisher.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly realtimePublisher: NotificationRealtimePublisherService,
  ) {}

  async createWorkItemCommentMentionNotifications(
    params: CreateMentionNotificationsParams,
    manager?: EntityManager,
  ): Promise<NotificationRow[]> {
    if (params.recipientUserIds.length === 0) {
      return [];
    }

    return this.repo.createWorkItemCommentMentionNotifications(params, manager);
  }

  publishNotifications(notifications: NotificationRow[]): void {
    for (const notification of notifications) {
      this.realtimePublisher.publishNotificationCreated(notification);
    }
  }
}
