export type GetAdminEmbeddingJobHealthSummaryParams = {
  staleQueuedAfterMinutes: number;
  staleRunningAfterMinutes: number;
};

export type AdminEmbeddingJobHealthSummary = {
  generatedAt: Date;
  staleQueuedAfterMinutes: number;
  staleRunningAfterMinutes: number;
  totalJobs: number;
  queuedJobs: number;
  claimableQueuedJobs: number;
  scheduledQueuedJobs: number;
  staleQueuedJobs: number;
  exhaustedQueuedJobs: number;
  runningJobs: number;
  staleRunningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  projectsWithPendingJobs: number;
};
