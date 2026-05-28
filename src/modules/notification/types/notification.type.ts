export const NOTIFICATION_TYPES = ['work_item_comment_mention'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TARGET_TYPES = ['work_item_comment'] as const;

export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export type NotificationRow = {
  notificationId: string;
  recipientUserId: string;
  actorUserId: string | null;
  workspaceId: string;
  projectId: string | null;
  notificationType: NotificationType;
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetId: string;
  metadata: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

export type ListNotificationsParams = {
  recipientUserId: string;
  unreadOnly: boolean;
  limit: number;
  offset: number;
};

export type ListNotificationsResult = {
  notifications: NotificationRow[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
};

export type CreateMentionNotificationsParams = {
  recipientUserIds: string[];
  actorUserId: string;
  workspaceId: string;
  projectId: string;
  itemId: string;
  commentId: string;
  commentBody: string;
};
