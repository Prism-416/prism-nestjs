import type { WorkspaceMemberRole } from '@/modules/workspace/constants';

export type WorkspaceRow = {
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
};

export type WorkspaceListRow = WorkspaceRow & {
  memberCount: number;
  projectCount: number;
};

export type WorkspaceMemberCandidateKind = 'existing' | 'external';

export const WORKSPACE_MEMBER_CANDIDATE_SEARCH_REASONS = [
  'success',
  'self',
  'already_member',
  'no_results',
] as const;

export type WorkspaceMemberCandidateSearchReason =
  (typeof WORKSPACE_MEMBER_CANDIDATE_SEARCH_REASONS)[number];

export type WorkspaceMemberRow = {
  userId: string;
  fullName: string;
  username: string;
  role: WorkspaceMemberRole;
  jobIds: string[];
  jobNames: string[];
  joinedAt: Date | null;
};

export type WorkspaceInvitationRow = {
  invitationId: string;
  workspaceId: string;
  senderId: string;
  receiverId: string | null;
  receiverEmail: string;
  role: WorkspaceMemberRow['role'];
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

export type WorkspaceInvitationReceiver = {
  userId: string | null;
  email: string;
  fullName: string | null;
  username: string | null;
};

export type WorkspaceInvitationEventType =
  | 'sent'
  | 'accepted'
  | 'denied'
  | 'expired'
  | 'cancelled';

export type WorkspaceInvitationEventRow = {
  eventId: string;
  invitationId: string;
  actorId: string | null;
  eventType: WorkspaceInvitationEventType;
  createdAt: Date;
};

export type WorkspaceUserRow = {
  userId: string;
  email: string;
  fullName: string;
  username: string;
};

export type WorkspaceJobRow = {
  jobId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

export type WorkspaceJobIdRow = {
  jobId: string;
};

export type WorkspaceProjectSummaryRow = {
  projectId: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
};
