import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CreateMentionNotificationsParams,
  CreateWorkItemAssignmentNotificationsParams,
  CreateWorkspaceInvitationNotificationParams,
  CreateWorkspaceMemberRemovedNotificationParams,
  NotificationRow,
} from '@/modules/notification/types';
import { WorkspaceAddedPayloadDto } from '@/modules/notification/dto';
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

  async createWorkItemAssignmentNotifications(
    params: CreateWorkItemAssignmentNotificationsParams,
    manager?: EntityManager,
  ): Promise<NotificationRow[]> {
    if (params.recipientUserIds.length === 0) {
      return [];
    }

    return this.repo.createWorkItemAssignmentNotifications(params, manager);
  }

  async createWorkspaceInvitationNotification(
    params: CreateWorkspaceInvitationNotificationParams,
    manager?: EntityManager,
  ): Promise<NotificationRow> {
    return this.repo.createWorkspaceInvitationNotification(params, manager);
  }

  async createWorkspaceMemberRemovedNotification(
    params: CreateWorkspaceMemberRemovedNotificationParams,
    manager?: EntityManager,
  ): Promise<NotificationRow> {
    return this.repo.createWorkspaceMemberRemovedNotification(params, manager);
  }

  publishNotifications(notifications: NotificationRow[]): void {
    for (const notification of notifications) {
      this.realtimePublisher.publishNotificationCreated(notification);
    }
  }

  publishWorkspaceAdded(payload: WorkspaceAddedPayloadDto): void {
    this.realtimePublisher.publishWorkspaceAdded(payload);
  }
}
