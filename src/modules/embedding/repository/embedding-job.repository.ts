import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  ClaimEmbeddingJobsParams,
  CreateEmbeddingJobParams,
  EmbeddingJobRow,
  EmbeddingJobType,
  EmbeddingProjectRow,
  EmbeddingWorkspaceRow,
  UpdateEmbeddingJobParams,
} from '@/modules/embedding/types';

@Injectable()
export class EmbeddingJobRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findWorkspaceById(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<EmbeddingWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      EmbeddingWorkspaceRow[]
    >(
      `
        SELECT
          w.workspace_id AS "workspaceId"
        FROM prism_workspaces_l w
        WHERE w.workspace_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspaceByIdAndMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<EmbeddingWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      EmbeddingWorkspaceRow[]
    >(
      `
        SELECT
          w.workspace_id AS "workspaceId"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async findProjectByWorkspaceIdAndId(
    workspaceId: string,
    projectId: string,
    manager?: EntityManager,
  ): Promise<EmbeddingProjectRow | null> {
    const projects = await this.getManager(manager).query<
      EmbeddingProjectRow[]
    >(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId"
        FROM prism_projects_l p
        WHERE p.workspace_id = $1
          AND p.project_id = $2
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [workspaceId, projectId],
    );

    return projects[0] ?? null;
  }

  async existsEmbeddingTarget(
    workspaceId: string,
    projectId: string | null,
    jobType: EmbeddingJobType,
    targetId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const targets = await this.getManager(manager).query<
      Array<{ exists: boolean }>
    >(
      `
        SELECT EXISTS (
          SELECT 1
          FROM prism_documents_l d
          WHERE $3 = 'document'
            AND $2::uuid IS NOT NULL
            AND d.workspace_id = $1
            AND d.project_id = $2
            AND d.document_id = $4
          UNION ALL
          SELECT 1
          FROM prism_document_chunks_l dc
          WHERE $3 = 'document_chunk'
            AND $2::uuid IS NOT NULL
            AND dc.workspace_id = $1
            AND dc.project_id = $2
            AND dc.chunk_id = $4
          UNION ALL
          SELECT 1
          FROM prism_work_items_l wi
          WHERE $3 = 'work_item'
            AND $2::uuid IS NOT NULL
            AND wi.workspace_id = $1
            AND wi.project_id = $2
            AND wi.item_id = $4
          UNION ALL
          SELECT 1
          FROM prism_work_item_comments_l c
                 INNER JOIN prism_work_items_l wi
                            ON wi.workspace_id = c.workspace_id
                           AND wi.item_id = c.item_id
          WHERE $3 = 'work_item_comment'
            AND $2::uuid IS NOT NULL
            AND c.workspace_id = $1
            AND wi.project_id = $2
            AND c.comment_id = $4
          UNION ALL
          SELECT 1
          FROM prism_agent_memories_l m
          WHERE $3 = 'agent_memory'
            AND m.workspace_id = $1
            AND m.memory_id = $4
        ) AS "exists"
      `,
      [workspaceId, projectId, jobType, targetId],
    );

    return targets[0]?.exists ?? false;
  }

  async createEmbeddingJob(
    params: CreateEmbeddingJobParams,
    manager?: EntityManager,
  ): Promise<EmbeddingJobRow> {
    const jobs = await this.getManager(manager).query<EmbeddingJobRow[]>(
      `
        INSERT INTO prism_embedding_jobs_l (
          workspace_id,
          project_id,
          job_type,
          target_id,
          model,
          dimensions,
          content_hash,
          object_name,
          max_attempts,
          scheduled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          embedding_job_id AS "embeddingJobId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          job_type AS "jobType",
          target_id AS "targetId",
          status,
          model,
          dimensions,
          content_hash AS "contentHash",
          object_name AS "objectName",
          attempts,
          max_attempts AS "maxAttempts",
          error_message AS "errorMessage",
          scheduled_at AS "scheduledAt",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.projectId ?? null,
        params.jobType,
        params.targetId,
        params.model,
        params.dimensions,
        params.contentHash ?? null,
        params.objectName ?? null,
        params.maxAttempts,
        params.scheduledAt,
      ],
    );

    return jobs[0];
  }

  async claimEmbeddingJobs(
    params: ClaimEmbeddingJobsParams,
    manager?: EntityManager,
  ): Promise<EmbeddingJobRow[]> {
    return this.getManager(manager).query<EmbeddingJobRow[]>(
      `
        WITH candidate_jobs AS (
          SELECT embedding_job_id
          FROM prism_embedding_jobs_l
          WHERE workspace_id = $1
            AND ($2::uuid IS NULL OR project_id = $2)
            AND status = 'queued'
            AND scheduled_at <= NOW()
            AND attempts < max_attempts
            AND ($3::text[] IS NULL OR job_type = ANY($3::text[]))
            AND ($4::text IS NULL OR model = $4)
          ORDER BY scheduled_at ASC,
                   created_at ASC,
                   embedding_job_id ASC
          LIMIT $5
          FOR UPDATE SKIP LOCKED
        )
        UPDATE prism_embedding_jobs_l j
        SET
          status = 'running',
          attempts = j.attempts + 1,
          error_message = NULL,
          started_at = NOW(),
          completed_at = NULL
        FROM candidate_jobs
        WHERE j.embedding_job_id = candidate_jobs.embedding_job_id
        RETURNING
          j.embedding_job_id AS "embeddingJobId",
          j.workspace_id AS "workspaceId",
          j.project_id AS "projectId",
          j.job_type AS "jobType",
          j.target_id AS "targetId",
          j.status,
          j.model,
          j.dimensions,
          j.content_hash AS "contentHash",
          j.object_name AS "objectName",
          j.attempts,
          j.max_attempts AS "maxAttempts",
          j.error_message AS "errorMessage",
          j.scheduled_at AS "scheduledAt",
          j.started_at AS "startedAt",
          j.completed_at AS "completedAt",
          j.created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.projectId ?? null,
        params.jobTypes ?? null,
        params.model ?? null,
        params.limit,
      ],
    );
  }

  async updateEmbeddingJob(
    params: UpdateEmbeddingJobParams,
    manager?: EntityManager,
  ): Promise<EmbeddingJobRow | null> {
    const jobs = await this.getManager(manager).query<EmbeddingJobRow[]>(
      `
        UPDATE prism_embedding_jobs_l
        SET
          status = $3,
          error_message = CASE
                            WHEN $3 IN ('queued', 'failed') THEN $4
                            ELSE NULL
                          END,
          scheduled_at = CASE
                           WHEN $3 = 'queued' THEN $5
                           ELSE scheduled_at
                         END,
          started_at = CASE
                         WHEN $3 = 'queued' THEN NULL
                         ELSE started_at
                       END,
          completed_at = CASE
                           WHEN $3 IN ('completed', 'failed', 'cancelled') THEN NOW()
                           WHEN $3 = 'queued' THEN NULL
                           ELSE completed_at
                         END
        WHERE workspace_id = $1
          AND embedding_job_id = $2
        RETURNING
          embedding_job_id AS "embeddingJobId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          job_type AS "jobType",
          target_id AS "targetId",
          status,
          model,
          dimensions,
          content_hash AS "contentHash",
          object_name AS "objectName",
          attempts,
          max_attempts AS "maxAttempts",
          error_message AS "errorMessage",
          scheduled_at AS "scheduledAt",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.embeddingJobId,
        params.status,
        params.errorMessage ?? null,
        params.scheduledAt ?? null,
      ],
    );

    return jobs[0] ?? null;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
