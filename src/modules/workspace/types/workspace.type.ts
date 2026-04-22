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

export type WorkspaceMemberRow = {
  userId: string;
  fullName: string;
  username: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Date | null;
  invitedAt: Date | null;
};

export type WorkspaceInvitationRow = {
  invitationId: string;
  workspaceId: string;
  senderId: string;
  receiverId: string;
  role: WorkspaceMemberRow['role'];
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

export type WorkspaceInvitationEventType = 'sent' | 'accepted' | 'denied';

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

export type WorkspaceProjectJobRow = {
  jobId: string;
  workspaceId: string;
  name: string;
  description: string;
  createdAt: Date;
};

export type WorkspaceProjectJobIdRow = {
  jobId: string;
};
