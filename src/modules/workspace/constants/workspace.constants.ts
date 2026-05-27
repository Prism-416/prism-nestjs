export const MAX_WORKSPACE_NAME_LENGTH = 50;
export const MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS = 5;
export const MAX_WORKSPACE_SLUG_LENGTH = 60;
export const WORKSPACE_SLUG_RANDOM_DIGITS = 9;
export const MAX_WORKSPACE_SLUG_BASE_LENGTH =
  MAX_WORKSPACE_SLUG_LENGTH - WORKSPACE_SLUG_RANDOM_DIGITS - 1;

export const WORKSPACE_MEMBER_ROLES = [
  'owner',
  'admin',
  'member',
  'viewer',
] as const;

export const WORKSPACE_ASSIGNABLE_MEMBER_ROLES = [
  'admin',
  'member',
  'viewer',
] as const;

export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

export const DEFAULT_WORKSPACE_JOBS = [
  {
    name: 'Product Manager',
    description: 'Defines product direction, requirements, and priorities.',
  },
  {
    name: 'Project Manager',
    description: 'Coordinates timelines, scope, and delivery.',
  },
  {
    name: 'Designer',
    description: 'Owns user experience, interface design, and visual quality.',
  },
  {
    name: 'Frontend Engineer',
    description: 'Builds client-side product experiences.',
  },
  {
    name: 'Backend Engineer',
    description: 'Builds APIs, services, and server-side systems.',
  },
  {
    name: 'Full-stack Engineer',
    description: 'Works across frontend and backend implementation.',
  },
  {
    name: 'QA Engineer',
    description: 'Verifies quality through testing and release checks.',
  },
  {
    name: 'DevOps Engineer',
    description: 'Manages deployment, infrastructure, and operations.',
  },
] as const;

export const WORKSPACE_INVITATION_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'expired',
  'cancelled',
] as const;

export type WorkspaceInvitationStatus =
  (typeof WORKSPACE_INVITATION_STATUSES)[number];
