export const AGENT_RUN_TRIGGER_TYPES = [
  'manual',
  'event',
  'scheduled',
  'webhook',
  'recursive',
] as const;

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AgentRunTriggerType = (typeof AGENT_RUN_TRIGGER_TYPES)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export type AgentProjectRow = {
  projectId: string;
};

export type AgentWorkItemRow = {
  itemId: string;
};

export type AgentRunRow = {
  runId: string;
  projectId: string;
  triggeredByUserId: string | null;
  workItemId: string | null;
  parentRunId: string | null;
  agentType: string;
  triggerType: AgentRunTriggerType;
  status: AgentRunStatus;
  objective: string;
  systemPromptVersion: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type SearchAgentRunsParams = {
  projectId: string;
  status?: AgentRunStatus;
  agentType?: string;
  workItemId?: string;
  limit: number;
  offset: number;
};

export type CreateAgentRunParams = {
  projectId: string;
  triggeredByUserId: string;
  workItemId?: string;
  parentRunId?: string;
  agentType: string;
  objective: string;
  systemPromptVersion?: string;
};

export type CancelAgentRunParams = {
  projectId: string;
  runId: string;
  cancellableStatuses: AgentRunStatus[];
};

export type ApproveAgentActionParams = {
  projectId: string;
  actionId: string;
  approvedByUserId: string;
  approvableStatuses: string[];
};

export type CancelAgentActionParams = {
  projectId: string;
  actionId: string;
  cancellableStatuses: string[];
};

export type CreateAgentActionEventParams = {
  actionId: string;
  actorUserId?: string;
  eventType: string;
  message?: string;
  eventObjectName?: string;
};

export type SearchAgentRunsResult = {
  items: AgentRunRow[];
  total: number;
  limit: number;
  offset: number;
};

export type AgentStepRow = {
  stepId: string;
  runId: string;
  stepOrder: number;
  stepType: string;
  status: string;
  title: string;
  inputObjectName: string | null;
  outputObjectName: string | null;
  inputSummary: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type AgentActionRow = {
  actionId: string;
  runId: string;
  stepId: string | null;
  projectId: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  status: string;
  reasoningSummary: string | null;
  payloadObjectName: string | null;
  resultObjectName: string | null;
  requiresApproval: boolean;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  executedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type AgentActionEventRow = {
  eventId: string;
  actionId: string;
  actorUserId: string | null;
  eventType: string;
  message: string | null;
  eventObjectName: string | null;
  createdAt: Date;
};
