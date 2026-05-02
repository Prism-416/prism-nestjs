export const MAX_WORKSPACE_NAME_LENGTH = 20;
export const MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS = 5;
export const MAX_WORKSPACE_SLUG_LENGTH = 20;
export const WORKSPACE_SLUG_RANDOM_DIGITS = 9;
export const MAX_WORKSPACE_SLUG_BASE_LENGTH =
  MAX_WORKSPACE_SLUG_LENGTH - WORKSPACE_SLUG_RANDOM_DIGITS - 1;

export const WORKSPACE_MEMBER_ROLES = ['admin', 'member', 'viewer'] as const;

export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

export const WORKSPACE_INVITATION_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'expired',
] as const;

export type WorkspaceInvitationStatus =
  (typeof WORKSPACE_INVITATION_STATUSES)[number];
