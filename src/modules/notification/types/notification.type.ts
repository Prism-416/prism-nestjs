export const NOTIFICATION_TYPES = [
  'work_item_comment_mention',
  'workspace_invitation',
  'workspace_member_removed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TARGET_TYPES = [
  'work_item_comment',
  'workspace_invitation',
  'workspace',
] as const;

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

export type CreateWorkspaceInvitationNotificationParams = {
  recipientUserId: string;
  actorUserId: string;
  workspaceId: string;
  invitationId: string;
  workspaceName: string;
  role: string;
  invitationLink: string;
  invitationToken: string;
  expiresAt: Date;
};

export type CreateWorkspaceMemberRemovedNotificationParams = {
  recipientUserId: string;
  actorUserId: string;
  workspaceId: string;
  workspaceName: string;
};
