import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { AdminEmbeddingCoverageSummary } from '@/modules/admin/types';

type AdminEmbeddingCoverageSummaryRow = {
  generatedAt: Date;
  totalTargets: string | number;
  embeddedTargets: string | number;
  currentEmbeddings: string | number;
  missingEmbeddings: string | number;
  staleEmbeddings: string | number;
  documentChunkTargets: string | number;
  documentChunkCurrentEmbeddings: string | number;
  documentChunkMissingEmbeddings: string | number;
  documentChunkStaleEmbeddings: string | number;
  workItemTargets: string | number;
  workItemCurrentEmbeddings: string | number;
  workItemMissingEmbeddings: string | number;
  workItemStaleEmbeddings: string | number;
  workItemCommentTargets: string | number;
  workItemCommentCurrentEmbeddings: string | number;
  workItemCommentMissingEmbeddings: string | number;
  workItemCommentStaleEmbeddings: string | number;
  agentMemoryTargets: string | number;
  agentMemoryCurrentEmbeddings: string | number;
  agentMemoryMissingEmbeddings: string | number;
  agentMemoryStaleEmbeddings: string | number;
  projectsWithMissingEmbeddings: string | number;
  projectsWithStaleEmbeddings: string | number;
};

@Injectable()
export class AdminEmbeddingCoverageRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getCoverageSummary(
    manager?: EntityManager,
  ): Promise<AdminEmbeddingCoverageSummary> {
    const rows = await this.getManager(manager).query<
      AdminEmbeddingCoverageSummaryRow[]
    >(
      `
        WITH active_workspaces AS (
          SELECT w.workspace_id
          FROM prism_workspaces_l w
          WHERE w.deleted_at IS NULL
            AND w.status = 'active'
        ),
        active_projects AS (
          SELECT p.workspace_id,
                 p.project_id
          FROM prism_projects_l p
                 INNER JOIN active_workspaces aw
                            ON aw.workspace_id = p.workspace_id
          WHERE p.status <> 'archived'
        ),
        coverage AS (
          SELECT
            'document_chunk'::TEXT AS target_type,
            dc.project_id,
            dce.chunk_id IS NOT NULL AS has_embedding,
            dce.chunk_id IS NOT NULL
              AND dce.content_hash IS DISTINCT FROM dc.content_hash AS is_stale
          FROM prism_document_chunks_l dc
                 INNER JOIN active_projects ap
                            ON ap.project_id = dc.project_id
                 LEFT JOIN prism_document_chunk_embeddings_l dce
                           ON dce.chunk_id = dc.chunk_id
          UNION ALL
          SELECT
            'work_item'::TEXT AS target_type,
            wi.project_id,
            wie.item_id IS NOT NULL AS has_embedding,
            wie.item_id IS NOT NULL
              AND (
                wie.embedded_title IS DISTINCT FROM wi.title
                OR wie.embedded_description IS DISTINCT FROM wi.description
              ) AS is_stale
          FROM prism_work_items_l wi
                 INNER JOIN active_projects ap
                            ON ap.project_id = wi.project_id
                 LEFT JOIN prism_work_item_embeddings_l wie
                           ON wie.item_id = wi.item_id
          UNION ALL
          SELECT
            'work_item_comment'::TEXT AS target_type,
            wi.project_id,
            wice.comment_id IS NOT NULL AS has_embedding,
            wice.comment_id IS NOT NULL
              AND wice.embedded_body IS DISTINCT FROM c.body AS is_stale
          FROM prism_work_item_comments_l c
                 INNER JOIN prism_work_items_l wi
                            ON wi.workspace_id = c.workspace_id
                           AND wi.item_id = c.item_id
                 INNER JOIN active_projects ap
                            ON ap.workspace_id = wi.workspace_id
                           AND ap.project_id = wi.project_id
                 LEFT JOIN prism_work_item_comment_embeddings_l wice
                           ON wice.comment_id = c.comment_id
          UNION ALL
          SELECT
            'agent_memory'::TEXT AS target_type,
            NULL::UUID AS project_id,
            ame.memory_id IS NOT NULL AS has_embedding,
            ame.memory_id IS NOT NULL
              AND ame.content_hash IS DISTINCT FROM m.content_hash AS is_stale
          FROM prism_agent_memories_l m
                 INNER JOIN active_workspaces aw
                            ON aw.workspace_id = m.workspace_id
                 LEFT JOIN prism_agent_memory_embeddings_l ame
                           ON ame.workspace_id = m.workspace_id
                          AND ame.memory_id = m.memory_id
        )
        SELECT
          NOW() AS "generatedAt",
          COUNT(*) AS "totalTargets",
          COUNT(*) FILTER (
            WHERE has_embedding
          ) AS "embeddedTargets",
          COUNT(*) FILTER (
            WHERE has_embedding
              AND NOT is_stale
          ) AS "currentEmbeddings",
          COUNT(*) FILTER (
            WHERE NOT has_embedding
          ) AS "missingEmbeddings",
          COUNT(*) FILTER (
            WHERE is_stale
          ) AS "staleEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'document_chunk'
          ) AS "documentChunkTargets",
          COUNT(*) FILTER (
            WHERE target_type = 'document_chunk'
              AND has_embedding
              AND NOT is_stale
          ) AS "documentChunkCurrentEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'document_chunk'
              AND NOT has_embedding
          ) AS "documentChunkMissingEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'document_chunk'
              AND is_stale
          ) AS "documentChunkStaleEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item'
          ) AS "workItemTargets",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item'
              AND has_embedding
              AND NOT is_stale
          ) AS "workItemCurrentEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item'
              AND NOT has_embedding
          ) AS "workItemMissingEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item'
              AND is_stale
          ) AS "workItemStaleEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item_comment'
          ) AS "workItemCommentTargets",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item_comment'
              AND has_embedding
              AND NOT is_stale
          ) AS "workItemCommentCurrentEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item_comment'
              AND NOT has_embedding
          ) AS "workItemCommentMissingEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'work_item_comment'
              AND is_stale
          ) AS "workItemCommentStaleEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'agent_memory'
          ) AS "agentMemoryTargets",
          COUNT(*) FILTER (
            WHERE target_type = 'agent_memory'
              AND has_embedding
              AND NOT is_stale
          ) AS "agentMemoryCurrentEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'agent_memory'
              AND NOT has_embedding
          ) AS "agentMemoryMissingEmbeddings",
          COUNT(*) FILTER (
            WHERE target_type = 'agent_memory'
              AND is_stale
          ) AS "agentMemoryStaleEmbeddings",
          COUNT(DISTINCT project_id) FILTER (
            WHERE NOT has_embedding
          ) AS "projectsWithMissingEmbeddings",
          COUNT(DISTINCT project_id) FILTER (
            WHERE is_stale
          ) AS "projectsWithStaleEmbeddings"
        FROM coverage
      `,
    );
    const row = rows[0];

    return {
      generatedAt: row.generatedAt,
      totalTargets: Number(row.totalTargets),
      embeddedTargets: Number(row.embeddedTargets),
      currentEmbeddings: Number(row.currentEmbeddings),
      missingEmbeddings: Number(row.missingEmbeddings),
      staleEmbeddings: Number(row.staleEmbeddings),
      documentChunkTargets: Number(row.documentChunkTargets),
      documentChunkCurrentEmbeddings: Number(
        row.documentChunkCurrentEmbeddings,
      ),
      documentChunkMissingEmbeddings: Number(
        row.documentChunkMissingEmbeddings,
      ),
      documentChunkStaleEmbeddings: Number(row.documentChunkStaleEmbeddings),
      workItemTargets: Number(row.workItemTargets),
      workItemCurrentEmbeddings: Number(row.workItemCurrentEmbeddings),
      workItemMissingEmbeddings: Number(row.workItemMissingEmbeddings),
      workItemStaleEmbeddings: Number(row.workItemStaleEmbeddings),
      workItemCommentTargets: Number(row.workItemCommentTargets),
      workItemCommentCurrentEmbeddings: Number(
        row.workItemCommentCurrentEmbeddings,
      ),
      workItemCommentMissingEmbeddings: Number(
        row.workItemCommentMissingEmbeddings,
      ),
      workItemCommentStaleEmbeddings: Number(
        row.workItemCommentStaleEmbeddings,
      ),
      agentMemoryTargets: Number(row.agentMemoryTargets),
      agentMemoryCurrentEmbeddings: Number(row.agentMemoryCurrentEmbeddings),
      agentMemoryMissingEmbeddings: Number(row.agentMemoryMissingEmbeddings),
      agentMemoryStaleEmbeddings: Number(row.agentMemoryStaleEmbeddings),
      projectsWithMissingEmbeddings: Number(row.projectsWithMissingEmbeddings),
      projectsWithStaleEmbeddings: Number(row.projectsWithStaleEmbeddings),
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
