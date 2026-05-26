export const EMBEDDING_JOB_TYPES = [
  'document',
  'document_chunk',
  'work_item',
  'work_item_comment',
  'agent_memory',
] as const;

export const EMBEDDING_JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

export const EMBEDDING_JOB_REPORT_STATUSES = [
  'queued',
  'completed',
  'failed',
  'cancelled',
] as const;

export const EMBEDDING_JOB_DIMENSIONS = 1536;

export type EmbeddingJobType = (typeof EMBEDDING_JOB_TYPES)[number];
export type EmbeddingJobStatus = (typeof EMBEDDING_JOB_STATUSES)[number];
export type EmbeddingJobReportStatus =
  (typeof EMBEDDING_JOB_REPORT_STATUSES)[number];

export type EmbeddingProjectRow = {
  projectId: string;
  workspaceId: string;
};

export type EmbeddingWorkspaceRow = {
  workspaceId: string;
};

export type EmbeddingJobRow = {
  embeddingJobId: string;
  workspaceId: string;
  projectId: string | null;
  jobType: EmbeddingJobType;
  targetId: string;
  status: EmbeddingJobStatus;
  model: string;
  dimensions: number;
  contentHash: string | null;
  objectName: string | null;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type CreateEmbeddingJobParams = {
  workspaceId: string;
  projectId?: string;
  jobType: EmbeddingJobType;
  targetId: string;
  model: string;
  dimensions: number;
  contentHash?: string;
  objectName?: string;
  maxAttempts: number;
  scheduledAt: Date;
};

export type ClaimEmbeddingJobsParams = {
  workspaceId: string;
  projectId?: string;
  jobTypes?: EmbeddingJobType[];
  model?: string;
  limit: number;
};

export type UpdateEmbeddingJobParams = {
  workspaceId: string;
  embeddingJobId: string;
  status: EmbeddingJobReportStatus;
  errorMessage?: string;
  scheduledAt?: Date;
};
