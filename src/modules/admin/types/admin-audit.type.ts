export const ADMIN_AUDIT_ACTIONS = [
  'service_account.create',
  'service_account.update',
  'service_account.activate',
  'service_account.deactivate',
  'service_api_token.create',
  'service_api_token.update',
  'service_api_token.revoke',
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export const ADMIN_AUDIT_ACTOR_TYPES = ['admin-password'] as const;

export type AdminAuditActorType = (typeof ADMIN_AUDIT_ACTOR_TYPES)[number];

export const ADMIN_AUDIT_TARGET_TYPES = [
  'service_account',
  'service_api_token',
] as const;

export type AdminAuditTargetType = (typeof ADMIN_AUDIT_TARGET_TYPES)[number];

export type AdminAuditContext = {
  actorType: AdminAuditActorType;
  actorId?: string | null;
  requestId?: string | null;
  reason?: string | null;
};

export type AdminAuditEventRow = {
  auditEventId: string;
  actorType: AdminAuditActorType;
  actorId: string | null;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId: string | null;
  targetName: string | null;
  requestId: string | null;
  reason: string | null;
  createdAt: Date;
};

export type CreateAdminAuditEventParams = AdminAuditContext & {
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
};

export type SearchAdminAuditEventsParams = {
  action?: AdminAuditAction;
  targetType?: AdminAuditTargetType;
  targetId?: string;
  limit: number;
  offset: number;
};

export type SearchAdminAuditEventsResult = {
  items: AdminAuditEventRow[];
  total: number;
  limit: number;
  offset: number;
};
