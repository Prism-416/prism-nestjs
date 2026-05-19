import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  AgentProjectRow,
  AgentRunRow,
  SearchAgentRunsParams,
  SearchAgentRunsResult,
} from '@/modules/agent/types';

@Injectable()
export class AgentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndMemberUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<AgentProjectRow | null> {
    const projects = await this.getManager(manager).query<AgentProjectRow[]>(
      `
        SELECT
          p.project_id AS "projectId"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async searchAgentRuns(
    params: SearchAgentRunsParams,
    manager?: EntityManager,
  ): Promise<SearchAgentRunsResult> {
    type SearchAgentRunDbRow = {
      runId: string | null;
      projectId: string | null;
      triggeredByUserId: string | null;
      workItemId: string | null;
      parentRunId: string | null;
      agentType: string | null;
      triggerType: AgentRunRow['triggerType'] | null;
      status: AgentRunRow['status'] | null;
      objective: string | null;
      systemPromptVersion: string | null;
      startedAt: Date | null;
      completedAt: Date | null;
      createdAt: Date | null;
      total: number;
    };

    const rows = await this.getManager(manager).query<SearchAgentRunDbRow[]>(
      `
        WITH filtered_runs AS (
          SELECT
            r.run_id,
            r.project_id,
            r.triggered_by_user_id,
            r.work_item_id,
            r.parent_run_id,
            r.agent_type,
            r.trigger_type,
            r.status,
            r.objective,
            r.system_prompt_version,
            r.started_at,
            r.completed_at,
            r.created_at
          FROM prism_agent_runs_l r
          WHERE r.project_id = $1
            AND ($2::text IS NULL OR r.status = $2)
            AND ($3::text IS NULL OR r.agent_type = $3)
            AND ($4::uuid IS NULL OR r.work_item_id = $4)
        ),
        total_count AS (
          SELECT COUNT(*)::int AS total
          FROM filtered_runs
        ),
        paged_runs AS (
          SELECT *
          FROM filtered_runs
          ORDER BY created_at DESC, run_id DESC
          LIMIT $5
          OFFSET $6
        )
        SELECT
          pr.run_id AS "runId",
          pr.project_id AS "projectId",
          pr.triggered_by_user_id AS "triggeredByUserId",
          pr.work_item_id AS "workItemId",
          pr.parent_run_id AS "parentRunId",
          pr.agent_type AS "agentType",
          pr.trigger_type AS "triggerType",
          pr.status,
          pr.objective,
          pr.system_prompt_version AS "systemPromptVersion",
          pr.started_at AS "startedAt",
          pr.completed_at AS "completedAt",
          pr.created_at AS "createdAt",
          tc.total
        FROM total_count tc
               LEFT JOIN paged_runs pr
                         ON TRUE
        ORDER BY pr.created_at DESC NULLS LAST,
                 pr.run_id DESC NULLS LAST
      `,
      [
        params.projectId,
        params.status ?? null,
        params.agentType ?? null,
        params.workItemId ?? null,
        params.limit,
        params.offset,
      ],
    );

    return {
      items: rows
        .filter(
          (row): row is SearchAgentRunDbRow & { runId: string } =>
            row.runId !== null,
        )
        .map((row) => ({
          runId: row.runId,
          projectId: row.projectId as string,
          triggeredByUserId: row.triggeredByUserId,
          workItemId: row.workItemId,
          parentRunId: row.parentRunId,
          agentType: row.agentType as string,
          triggerType: row.triggerType as AgentRunRow['triggerType'],
          status: row.status as AgentRunRow['status'],
          objective: row.objective as string,
          systemPromptVersion: row.systemPromptVersion,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
          createdAt: row.createdAt as Date,
        })),
      total: rows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
