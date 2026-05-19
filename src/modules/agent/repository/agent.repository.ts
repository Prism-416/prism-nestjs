import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  AgentProjectRow,
  AgentRunRow,
  AgentStepRow,
  AgentWorkItemRow,
  CancelAgentRunParams,
  CreateAgentRunParams,
  SearchAgentRunsParams,
  SearchAgentRunsResult,
} from '@/modules/agent/types';

type AgentRunDbRow = {
  runId: string;
  projectId: string;
  triggeredByUserId: string | null;
  workItemId: string | null;
  parentRunId: string | null;
  agentType: string;
  triggerType: AgentRunRow['triggerType'];
  status: AgentRunRow['status'];
  objective: string;
  systemPromptVersion: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

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
      [Key in keyof AgentRunDbRow]: AgentRunDbRow[Key] | null;
    } & { total: number };

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
          (row): row is AgentRunDbRow & { total: number } => row.runId !== null,
        )
        .map((row) => this.mapAgentRunRow(row)),
      total: rows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async createAgentRun(
    params: CreateAgentRunParams,
    manager?: EntityManager,
  ): Promise<AgentRunRow> {
    const runs = await this.getManager(manager).query<AgentRunDbRow[]>(
      `
        INSERT INTO prism_agent_runs_l (
          project_id,
          triggered_by_user_id,
          work_item_id,
          parent_run_id,
          agent_type,
          trigger_type,
          objective,
          system_prompt_version
        )
        VALUES ($1, $2, $3, $4, $5, 'manual', $6, $7)
        RETURNING
          run_id AS "runId",
          project_id AS "projectId",
          triggered_by_user_id AS "triggeredByUserId",
          work_item_id AS "workItemId",
          parent_run_id AS "parentRunId",
          agent_type AS "agentType",
          trigger_type AS "triggerType",
          status,
          objective,
          system_prompt_version AS "systemPromptVersion",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.triggeredByUserId,
        params.workItemId ?? null,
        params.parentRunId ?? null,
        params.agentType,
        params.objective,
        params.systemPromptVersion ?? null,
      ],
    );

    return this.mapAgentRunRow(runs[0]);
  }

  async findAgentRunById(
    projectId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentRunRow | null> {
    const runs = await this.getManager(manager).query<AgentRunDbRow[]>(
      `
        SELECT
          run_id AS "runId",
          project_id AS "projectId",
          triggered_by_user_id AS "triggeredByUserId",
          work_item_id AS "workItemId",
          parent_run_id AS "parentRunId",
          agent_type AS "agentType",
          trigger_type AS "triggerType",
          status,
          objective,
          system_prompt_version AS "systemPromptVersion",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt"
        FROM prism_agent_runs_l
        WHERE project_id = $1
          AND run_id = $2
        LIMIT 1
      `,
      [projectId, runId],
    );

    return runs[0] ? this.mapAgentRunRow(runs[0]) : null;
  }

  async cancelAgentRun(
    params: CancelAgentRunParams,
    manager?: EntityManager,
  ): Promise<AgentRunRow | null> {
    const runs = await this.getManager(manager).query<AgentRunDbRow[]>(
      `
        UPDATE prism_agent_runs_l
        SET
          status = 'cancelled',
          completed_at = NOW()
        WHERE project_id = $1
          AND run_id = $2
          AND status = ANY($3::text[])
        RETURNING
          run_id AS "runId",
          project_id AS "projectId",
          triggered_by_user_id AS "triggeredByUserId",
          work_item_id AS "workItemId",
          parent_run_id AS "parentRunId",
          agent_type AS "agentType",
          trigger_type AS "triggerType",
          status,
          objective,
          system_prompt_version AS "systemPromptVersion",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt"
      `,
      [params.projectId, params.runId, params.cancellableStatuses],
    );

    return runs[0] ? this.mapAgentRunRow(runs[0]) : null;
  }

  async findAgentStepsByRunId(
    projectId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentStepRow[]> {
    return this.getManager(manager).query<AgentStepRow[]>(
      `
        SELECT
          s.step_id AS "stepId",
          s.run_id AS "runId",
          s.step_order AS "stepOrder",
          s.step_type AS "stepType",
          s.status,
          s.title,
          s.input_object_name AS "inputObjectName",
          s.output_object_name AS "outputObjectName",
          s.input_summary AS "inputSummary",
          s.output_summary AS "outputSummary",
          s.error_message AS "errorMessage",
          s.started_at AS "startedAt",
          s.completed_at AS "completedAt",
          s.created_at AS "createdAt"
        FROM prism_agent_steps_l s
               INNER JOIN prism_agent_runs_l r
                          ON r.run_id = s.run_id
        WHERE r.project_id = $1
          AND s.run_id = $2
        ORDER BY s.step_order ASC,
                 s.step_id ASC
      `,
      [projectId, runId],
    );
  }

  async findWorkItemById(
    projectId: string,
    workItemId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkItemRow | null> {
    const workItems = await this.getManager(manager).query<AgentWorkItemRow[]>(
      `
        SELECT
          item_id AS "itemId"
        FROM prism_work_items_l
        WHERE project_id = $1
          AND item_id = $2
        LIMIT 1
      `,
      [projectId, workItemId],
    );

    return workItems[0] ?? null;
  }

  private mapAgentRunRow(row: AgentRunDbRow): AgentRunRow {
    return {
      runId: row.runId,
      projectId: row.projectId,
      triggeredByUserId: row.triggeredByUserId,
      workItemId: row.workItemId,
      parentRunId: row.parentRunId,
      agentType: row.agentType,
      triggerType: row.triggerType,
      status: row.status,
      objective: row.objective,
      systemPromptVersion: row.systemPromptVersion,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
