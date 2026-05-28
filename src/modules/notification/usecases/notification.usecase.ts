import { Injectable } from '@nestjs/common';
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  NotificationResponseDto,
} from '@/modules/notification/dto';
import { NotificationNotFoundError } from '@/modules/notification/errors';
import { NotificationRepository } from '@/modules/notification/repository';

@Injectable()
export class NotificationUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async listNotifications(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    return this.repo.listNotifications({
      recipientUserId: userId,
      unreadOnly: query.unreadOnly ?? false,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async markNotificationRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repo.markNotificationRead(
      userId,
      notificationId,
    );
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.repo.markAllNotificationsRead(userId);
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const deleted = await this.repo.deleteNotification(userId, notificationId);
    if (!deleted) {
      throw new NotificationNotFoundError();
    }
  }
}
