import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type {
  AdminEmbeddingJobHealthSummary,
  GetAdminEmbeddingJobHealthSummaryParams,
} from '@/modules/admin/types';

type AdminEmbeddingJobHealthSummaryRow = {
  generatedAt: Date;
  totalJobs: string | number;
  queuedJobs: string | number;
  claimableQueuedJobs: string | number;
  scheduledQueuedJobs: string | number;
  staleQueuedJobs: string | number;
  exhaustedQueuedJobs: string | number;
  runningJobs: string | number;
  staleRunningJobs: string | number;
  completedJobs: string | number;
  failedJobs: string | number;
  cancelledJobs: string | number;
  projectsWithPendingJobs: string | number;
};

@Injectable()
export class AdminEmbeddingJobRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getHealthSummary(
    params: GetAdminEmbeddingJobHealthSummaryParams,
    manager?: EntityManager,
  ): Promise<AdminEmbeddingJobHealthSummary> {
    const rows = await this.getManager(manager).query<
      AdminEmbeddingJobHealthSummaryRow[]
    >(
      `
        SELECT
          NOW() AS "generatedAt",
          COUNT(*) AS "totalJobs",
          COUNT(*) FILTER (
            WHERE status = 'queued'
          ) AS "queuedJobs",
          COUNT(*) FILTER (
            WHERE status = 'queued'
              AND scheduled_at <= NOW()
              AND attempts < max_attempts
          ) AS "claimableQueuedJobs",
          COUNT(*) FILTER (
            WHERE status = 'queued'
              AND scheduled_at > NOW()
          ) AS "scheduledQueuedJobs",
          COUNT(*) FILTER (
            WHERE status = 'queued'
              AND scheduled_at <= NOW() - ($1::INT * INTERVAL '1 minute')
          ) AS "staleQueuedJobs",
          COUNT(*) FILTER (
            WHERE status = 'queued'
              AND attempts >= max_attempts
          ) AS "exhaustedQueuedJobs",
          COUNT(*) FILTER (
            WHERE status = 'running'
          ) AS "runningJobs",
          COUNT(*) FILTER (
            WHERE status = 'running'
              AND started_at IS NOT NULL
              AND started_at <= NOW() - ($2::INT * INTERVAL '1 minute')
          ) AS "staleRunningJobs",
          COUNT(*) FILTER (
            WHERE status = 'completed'
          ) AS "completedJobs",
          COUNT(*) FILTER (
            WHERE status = 'failed'
          ) AS "failedJobs",
          COUNT(*) FILTER (
            WHERE status = 'cancelled'
          ) AS "cancelledJobs",
          COUNT(DISTINCT project_id) FILTER (
            WHERE status IN ('queued', 'running')
          ) AS "projectsWithPendingJobs"
        FROM prism_embedding_jobs_l
      `,
      [params.staleQueuedAfterMinutes, params.staleRunningAfterMinutes],
    );
    const row = rows[0];

    return {
      generatedAt: row.generatedAt,
      staleQueuedAfterMinutes: params.staleQueuedAfterMinutes,
      staleRunningAfterMinutes: params.staleRunningAfterMinutes,
      totalJobs: Number(row.totalJobs),
      queuedJobs: Number(row.queuedJobs),
      claimableQueuedJobs: Number(row.claimableQueuedJobs),
      scheduledQueuedJobs: Number(row.scheduledQueuedJobs),
      staleQueuedJobs: Number(row.staleQueuedJobs),
      exhaustedQueuedJobs: Number(row.exhaustedQueuedJobs),
      runningJobs: Number(row.runningJobs),
      staleRunningJobs: Number(row.staleRunningJobs),
      completedJobs: Number(row.completedJobs),
      failedJobs: Number(row.failedJobs),
      cancelledJobs: Number(row.cancelledJobs),
      projectsWithPendingJobs: Number(row.projectsWithPendingJobs),
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
