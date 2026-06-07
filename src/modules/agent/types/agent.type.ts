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

export const AGENT_STEP_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
] as const;

export const AGENT_ACTION_STATUSES = [
  'proposed',
  'approved',
  'rejected',
  'executed',
  'failed',
  'cancelled',
] as const;

export const AGENT_MEMORY_TYPES = [
  'agent_decision',
  'agent_summary',
  'agent_plan',
  'agent_result',
  'workspace_fact',
  'user_preference',
] as const;

export const AGENT_EMBEDDING_DIMENSIONS = 1536;

export type AgentRunTriggerType = (typeof AGENT_RUN_TRIGGER_TYPES)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export type AgentStepStatus = (typeof AGENT_STEP_STATUSES)[number];
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];
export type AgentMemoryType = (typeof AGENT_MEMORY_TYPES)[number];

export type AgentWorkspaceRow = {
  workspaceId: string;
};

export type AgentWorkItemRow = {
  itemId: string;
};

export type AgentRunRow = {
  runId: string;
  workspaceId: string;
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
  workspaceId: string;
  status?: AgentRunStatus;
  agentType?: string;
  workItemId?: string;
  limit: number;
  offset: number;
};

export type CreateAgentRunParams = {
  workspaceId: string;
  triggeredByUserId: string;
  workItemId?: string;
  parentRunId?: string;
  agentType: string;
  objective: string;
  systemPromptVersion?: string;
};

export type CreateAgentRunForInternalParams = {
  workspaceId: string;
  runId?: string;
  triggeredByUserId?: string;
  workItemId?: string;
  parentRunId?: string;
  agentType: string;
  triggerType: AgentRunTriggerType;
  status: AgentRunStatus;
  objective: string;
  systemPromptVersion?: string;
};

export type CancelAgentRunParams = {
  workspaceId: string;
  runId: string;
  cancellableStatuses: AgentRunStatus[];
};

export type UpdateAgentRunStatusParams = {
  workspaceId: string;
  runId: string;
  status: AgentRunStatus;
};

export type UpsertAgentStepParams = {
  workspaceId: string;
  runId: string;
  stepId?: string;
  stepOrder: number;
  stepType: string;
  status: AgentStepStatus;
  title: string;
  inputObjectName?: string;
  outputObjectName?: string;
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
};

export type ApproveAgentActionParams = {
  workspaceId: string;
  actionId: string;
  approvedByUserId: string;
  approvableStatuses: string[];
};

export type CancelAgentActionParams = {
  workspaceId: string;
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

export type UpsertAgentActionParams = {
  workspaceId: string;
  runId: string;
  actionId?: string;
  stepId?: string;
  actionType: string;
  targetType: string;
  targetId?: string;
  status: AgentActionStatus;
  reasoningSummary?: string;
  payloadObjectName?: string;
  resultObjectName?: string;
  requiresApproval: boolean;
  approvedByUserId?: string;
  executedAt?: Date;
  errorMessage?: string;
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
  status: AgentStepStatus;
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
  workspaceId: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  status: AgentActionStatus;
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

export type AgentMemoryRow = {
  memoryId: string;
  workspaceId: string;
  runId: string | null;
  stepId: string | null;
  memoryType: AgentMemoryType;
  title: string | null;
  content: string;
  contentHash: string;
  createdAt: Date;
};

export type AgentMemoryEmbeddingRow = {
  memoryId: string;
  workspaceId: string;
  model: string;
  dimensions: number;
  contentHash: string;
  createdAt: Date;
  embeddedAt: Date;
};

export type UpsertAgentMemoryParams = {
  workspaceId: string;
  memoryId?: string;
  runId?: string;
  stepId?: string;
  memoryType: AgentMemoryType;
  title?: string;
  content: string;
  contentHash: string;
};

export type UpsertAgentMemoryEmbeddingParams = {
  workspaceId: string;
  memoryId: string;
  contentHash: string;
  model: string;
  dimensions: number;
  embedding: number[];
};

export type UpsertAgentStepResult = {
  step: AgentStepRow;
  wasCreated: boolean;
};

export type UpsertAgentActionResult = {
  action: AgentActionRow;
  wasCreated: boolean;
};

export type CreateAgentRunForInternalResult = {
  run: AgentRunRow;
  wasCreated: boolean;
};
