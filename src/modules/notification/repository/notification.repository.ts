import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateMentionNotificationsParams,
  CreateWorkspaceInvitationNotificationParams,
  CreateWorkspaceMemberRemovedNotificationParams,
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationRow,
} from '@/modules/notification/types';

@Injectable()
export class NotificationRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createWorkItemCommentMentionNotifications(
    params: CreateMentionNotificationsParams,
    manager?: EntityManager,
  ): Promise<NotificationRow[]> {
    const notifications = await this.getManager(manager).query<
      NotificationRow[]
    >(
      `
        WITH recipients AS (
          SELECT DISTINCT recipient_user_id
          FROM unnest($1::uuid[]) AS input(recipient_user_id)
          WHERE recipient_user_id <> $2
        )
        INSERT INTO prism_notifications_l (
          recipient_user_id,
          actor_user_id,
          workspace_id,
          project_id,
          notification_type,
          title,
          body,
          target_type,
          target_id,
          metadata
        )
        SELECT
          recipients.recipient_user_id,
          $2,
          $3,
          $4,
          'work_item_comment_mention',
          (
            SELECT CONCAT(full_name, ' mentioned you')
            FROM prism_users_l
            WHERE user_id = $2
          ),
          $5,
          'work_item_comment',
          $6,
          jsonb_build_object(
            'itemId', $7::uuid,
            'commentId', $6::uuid,
            'commentBody', $5::text
          )
        FROM recipients
        ON CONFLICT (recipient_user_id, notification_type, target_id)
        DO UPDATE SET
          actor_user_id = EXCLUDED.actor_user_id,
          workspace_id = EXCLUDED.workspace_id,
          project_id = EXCLUDED.project_id,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          read_at = NULL,
          created_at = NOW()
        RETURNING
          notification_id AS "notificationId",
          recipient_user_id AS "recipientUserId",
          actor_user_id AS "actorUserId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          notification_type AS "notificationType",
          title,
          body,
          target_type AS "targetType",
          target_id AS "targetId",
          metadata,
          read_at AS "readAt",
          created_at AS "createdAt"
      `,
      [
        params.recipientUserIds,
        params.actorUserId,
        params.workspaceId,
        params.projectId,
        params.commentBody,
        params.commentId,
        params.itemId,
      ],
    );

    return notifications;
  }

  async createWorkspaceInvitationNotification(
    params: CreateWorkspaceInvitationNotificationParams,
    manager?: EntityManager,
  ): Promise<NotificationRow> {
    const notifications = await this.getManager(manager).query<
      NotificationRow[]
    >(
      `
        INSERT INTO prism_notifications_l (
          recipient_user_id,
          actor_user_id,
          workspace_id,
          project_id,
          notification_type,
          title,
          body,
          target_type,
          target_id,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          NULL,
          'workspace_invitation',
          'Workspace invitation',
          CONCAT('You have been invited to join ', $5::text, ' as ', $6::text, '.'),
          'workspace_invitation',
          $4,
          jsonb_build_object(
            'workspaceId', $3::uuid,
            'workspaceName', $5::text,
            'role', $6::text,
            'invitationLink', $7::text,
            'invitationToken', $8::text,
            'expiresAt', $9::timestamptz
          )
        )
        ON CONFLICT (recipient_user_id, notification_type, target_id)
        DO UPDATE SET
          actor_user_id = EXCLUDED.actor_user_id,
          workspace_id = EXCLUDED.workspace_id,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          read_at = NULL,
          created_at = NOW()
        RETURNING
          notification_id AS "notificationId",
          recipient_user_id AS "recipientUserId",
          actor_user_id AS "actorUserId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          notification_type AS "notificationType",
          title,
          body,
          target_type AS "targetType",
          target_id AS "targetId",
          metadata,
          read_at AS "readAt",
          created_at AS "createdAt"
      `,
      [
        params.recipientUserId,
        params.actorUserId,
        params.workspaceId,
        params.invitationId,
        params.workspaceName,
        params.role,
        params.invitationLink,
        params.invitationToken,
        params.expiresAt,
      ],
    );

    return notifications[0];
  }

  async createWorkspaceMemberRemovedNotification(
    params: CreateWorkspaceMemberRemovedNotificationParams,
    manager?: EntityManager,
  ): Promise<NotificationRow> {
    const notifications = await this.getManager(manager).query<
      NotificationRow[]
    >(
      `
        INSERT INTO prism_notifications_l (
          recipient_user_id,
          actor_user_id,
          workspace_id,
          project_id,
          notification_type,
          title,
          body,
          target_type,
          target_id,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          NULL,
          'workspace_member_removed',
          'Workspace access removed',
          CONCAT('You were removed from ', $4::text, '.'),
          'workspace',
          $3,
          jsonb_build_object(
            'workspaceId', $3::uuid,
            'workspaceName', $4::text
          )
        )
        ON CONFLICT (recipient_user_id, notification_type, target_id)
        DO UPDATE SET
          actor_user_id = EXCLUDED.actor_user_id,
          workspace_id = EXCLUDED.workspace_id,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          read_at = NULL,
          created_at = NOW()
        RETURNING
          notification_id AS "notificationId",
          recipient_user_id AS "recipientUserId",
          actor_user_id AS "actorUserId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          notification_type AS "notificationType",
          title,
          body,
          target_type AS "targetType",
          target_id AS "targetId",
          metadata,
          read_at AS "readAt",
          created_at AS "createdAt"
      `,
      [
        params.recipientUserId,
        params.actorUserId,
        params.workspaceId,
        params.workspaceName,
      ],
    );

    return notifications[0];
  }

  async listNotifications(
    params: ListNotificationsParams,
    manager?: EntityManager,
  ): Promise<ListNotificationsResult> {
    const notifications = await this.getManager(manager).query<
      NotificationRow[]
    >(
      `
        SELECT
          notification_id AS "notificationId",
          recipient_user_id AS "recipientUserId",
          actor_user_id AS "actorUserId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          notification_type AS "notificationType",
          title,
          body,
          target_type AS "targetType",
          target_id AS "targetId",
          metadata,
          read_at AS "readAt",
          created_at AS "createdAt"
        FROM prism_notifications_l
        WHERE recipient_user_id = $1
          AND ($2::boolean = FALSE OR read_at IS NULL)
        ORDER BY created_at DESC, notification_id DESC
        LIMIT $3
        OFFSET $4
      `,
      [params.recipientUserId, params.unreadOnly, params.limit, params.offset],
    );

    const counts = await this.getManager(manager).query<
      Array<{ total: number; unreadCount: number }>
    >(
      `
        SELECT
          COUNT(*) FILTER (WHERE $2::boolean = FALSE OR read_at IS NULL)::int AS total,
          COUNT(*) FILTER (WHERE read_at IS NULL)::int AS "unreadCount"
        FROM prism_notifications_l
        WHERE recipient_user_id = $1
      `,
      [params.recipientUserId, params.unreadOnly],
    );

    return {
      notifications,
      total: counts[0]?.total ?? 0,
      unreadCount: counts[0]?.unreadCount ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async markNotificationRead(
    recipientUserId: string,
    notificationId: string,
    manager?: EntityManager,
  ): Promise<NotificationRow | null> {
    const notifications = await this.getManager(manager).query<
      NotificationRow[]
    >(
      `
        UPDATE prism_notifications_l
        SET read_at = COALESCE(read_at, NOW())
        WHERE notification_id = $1
          AND recipient_user_id = $2
        RETURNING
          notification_id AS "notificationId",
          recipient_user_id AS "recipientUserId",
          actor_user_id AS "actorUserId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          notification_type AS "notificationType",
          title,
          body,
          target_type AS "targetType",
          target_id AS "targetId",
          metadata,
          read_at AS "readAt",
          created_at AS "createdAt"
      `,
      [notificationId, recipientUserId],
    );

    return notifications[0] ?? null;
  }

  async markAllNotificationsRead(
    recipientUserId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_notifications_l
        SET read_at = COALESCE(read_at, NOW())
        WHERE recipient_user_id = $1
          AND read_at IS NULL
      `,
      [recipientUserId],
    );
  }

  async deleteNotification(
    recipientUserId: string,
    notificationId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const result = await this.getManager(manager).query<
      Array<{ notificationId: string }>
    >(
      `
        DELETE FROM prism_notifications_l
        WHERE notification_id = $1
          AND recipient_user_id = $2
        RETURNING notification_id AS "notificationId"
      `,
      [notificationId, recipientUserId],
    );

    return result.length > 0;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
