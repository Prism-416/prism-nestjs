import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  AgentActionEventRow,
  AgentActionRow,
  AgentMemoryEmbeddingRow,
  AgentMemoryRow,
  AgentRunRow,
  AgentStepRow,
  AgentWorkspaceRow,
  AgentWorkItemRow,
  ApproveAgentActionParams,
  CancelAgentActionParams,
  CancelAgentRunParams,
  CreateAgentActionEventParams,
  CreateAgentRunForInternalParams,
  CreateAgentRunForInternalResult,
  CreateAgentRunParams,
  SearchAgentRunsParams,
  SearchAgentRunsResult,
  UpdateAgentRunStatusParams,
  UpsertAgentActionParams,
  UpsertAgentActionResult,
  UpsertAgentMemoryEmbeddingParams,
  UpsertAgentMemoryParams,
  UpsertAgentStepParams,
  UpsertAgentStepResult,
} from '@/modules/agent/types';

type AgentRunDbRow = {
  runId: string;
  workspaceId: string;
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

  async findWorkspaceByIdAndMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      AgentWorkspaceRow[]
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

  async findWorkspaceById(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      AgentWorkspaceRow[]
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
            r.workspace_id,
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
          WHERE r.workspace_id = $1
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
          pr.workspace_id AS "workspaceId",
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
        params.workspaceId,
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
          workspace_id,
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
          workspace_id AS "workspaceId",
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
        params.workspaceId,
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

  async createAgentRunForInternal(
    params: CreateAgentRunForInternalParams,
    manager?: EntityManager,
  ): Promise<CreateAgentRunForInternalResult | null> {
    const runs = await this.getManager(manager).query<
      Array<AgentRunDbRow & { wasCreated: boolean }>
    >(
      `
        WITH input_run AS (
          SELECT
            COALESCE($2::uuid, gen_random_uuid()) AS run_id,
            $1::uuid AS workspace_id,
            $3::uuid AS triggered_by_user_id,
            $4::uuid AS work_item_id,
            $5::uuid AS parent_run_id,
            $6::text AS agent_type,
            $7::text AS trigger_type,
            $8::text AS status,
            $9::text AS objective,
            $10::text AS system_prompt_version
        ),
        inserted_run AS (
          INSERT INTO prism_agent_runs_l (
            run_id,
            workspace_id,
            triggered_by_user_id,
            work_item_id,
            parent_run_id,
            agent_type,
            trigger_type,
            status,
            objective,
            system_prompt_version,
            started_at,
            completed_at
          )
          SELECT
            input_run.run_id,
            input_run.workspace_id,
            input_run.triggered_by_user_id,
            input_run.work_item_id,
            input_run.parent_run_id,
            input_run.agent_type,
            input_run.trigger_type,
            input_run.status,
            input_run.objective,
            input_run.system_prompt_version,
            CASE WHEN input_run.status = 'running' THEN NOW() ELSE NULL END,
            CASE
              WHEN input_run.status IN ('completed', 'failed', 'cancelled') THEN NOW()
              ELSE NULL
            END
          FROM input_run
          ON CONFLICT (run_id) DO NOTHING
          RETURNING
            run_id AS "runId",
            workspace_id AS "workspaceId",
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
            created_at AS "createdAt",
            TRUE AS "wasCreated"
        )
        SELECT *
        FROM inserted_run
        UNION ALL
        SELECT
          r.run_id AS "runId",
          r.workspace_id AS "workspaceId",
          r.triggered_by_user_id AS "triggeredByUserId",
          r.work_item_id AS "workItemId",
          r.parent_run_id AS "parentRunId",
          r.agent_type AS "agentType",
          r.trigger_type AS "triggerType",
          r.status,
          r.objective,
          r.system_prompt_version AS "systemPromptVersion",
          r.started_at AS "startedAt",
          r.completed_at AS "completedAt",
          r.created_at AS "createdAt",
          FALSE AS "wasCreated"
        FROM prism_agent_runs_l r
               INNER JOIN input_run
                          ON input_run.run_id = r.run_id
        WHERE r.workspace_id = input_run.workspace_id
          AND NOT EXISTS (SELECT 1 FROM inserted_run)
        LIMIT 1
      `,
      [
        params.workspaceId,
        params.runId ?? null,
        params.triggeredByUserId ?? null,
        params.workItemId ?? null,
        params.parentRunId ?? null,
        params.agentType,
        params.triggerType,
        params.status,
        params.objective,
        params.systemPromptVersion ?? null,
      ],
    );

    const run = runs[0];
    if (!run) {
      return null;
    }

    const { wasCreated, ...row } = run;
    return { run: this.mapAgentRunRow(row), wasCreated };
  }

  async findAgentRunById(
    workspaceId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentRunRow | null> {
    const runs = await this.getManager(manager).query<AgentRunDbRow[]>(
      `
        SELECT
          run_id AS "runId",
          workspace_id AS "workspaceId",
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
        WHERE workspace_id = $1
          AND run_id = $2
        LIMIT 1
      `,
      [workspaceId, runId],
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
        WHERE workspace_id = $1
          AND run_id = $2
          AND status = ANY($3::text[])
        RETURNING
          run_id AS "runId",
          workspace_id AS "workspaceId",
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
      [params.workspaceId, params.runId, params.cancellableStatuses],
    );

    return runs[0] ? this.mapAgentRunRow(runs[0]) : null;
  }

  async updateAgentRunStatus(
    params: UpdateAgentRunStatusParams,
    manager?: EntityManager,
  ): Promise<AgentRunRow | null> {
    const runs = await this.getManager(manager).query<AgentRunDbRow[]>(
      `
        UPDATE prism_agent_runs_l
        SET
          status = $3::text,
          started_at = CASE
            WHEN $3::text = 'running' THEN COALESCE(started_at, NOW())
            ELSE started_at
          END,
          completed_at = CASE
            WHEN $3::text IN ('completed', 'failed', 'cancelled') THEN COALESCE(completed_at, NOW())
            WHEN $3::text IN ('queued', 'running', 'waiting') THEN NULL
            ELSE completed_at
          END
        WHERE workspace_id = $1
          AND run_id = $2
        RETURNING
          run_id AS "runId",
          workspace_id AS "workspaceId",
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
      [params.workspaceId, params.runId, params.status],
    );

    return runs[0] ? this.mapAgentRunRow(runs[0]) : null;
  }

  async upsertAgentStep(
    params: UpsertAgentStepParams,
    manager?: EntityManager,
  ): Promise<UpsertAgentStepResult | null> {
    const steps = await this.getManager(manager).query<
      Array<AgentStepRow & { wasCreated: boolean }>
    >(
      `
        WITH existing_step AS (
          SELECT s.step_id
          FROM prism_agent_steps_l s
                 INNER JOIN prism_agent_runs_l r
                            ON r.run_id = s.run_id
                           AND r.workspace_id = $1
          WHERE s.run_id = $2
            AND s.step_order = $4
        ),
        validated_step AS (
          SELECT
            COALESCE($3::uuid, gen_random_uuid()) AS step_id
          WHERE EXISTS (
            SELECT 1
            FROM prism_agent_runs_l r
            WHERE r.workspace_id = $1
              AND r.run_id = $2
          )
        )
        INSERT INTO prism_agent_steps_l (
          step_id,
          run_id,
          step_order,
          step_type,
          status,
          title,
          input_object_name,
          output_object_name,
          input_summary,
          output_summary,
          error_message,
          started_at,
          completed_at
        )
        SELECT
          validated_step.step_id,
          $2,
          $4,
          $5,
          $6::text,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          CASE WHEN $6::text = 'running' THEN NOW() ELSE NULL END,
          CASE WHEN $6::text IN ('completed', 'failed', 'skipped') THEN NOW() ELSE NULL END
        FROM validated_step
        ON CONFLICT (run_id, step_order)
        DO UPDATE SET
          step_type = EXCLUDED.step_type,
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          input_object_name = EXCLUDED.input_object_name,
          output_object_name = EXCLUDED.output_object_name,
          input_summary = EXCLUDED.input_summary,
          output_summary = EXCLUDED.output_summary,
          error_message = EXCLUDED.error_message,
          started_at = CASE
            WHEN EXCLUDED.status = 'running' THEN COALESCE(prism_agent_steps_l.started_at, NOW())
            ELSE prism_agent_steps_l.started_at
          END,
          completed_at = CASE
            WHEN EXCLUDED.status IN ('completed', 'failed', 'skipped') THEN COALESCE(prism_agent_steps_l.completed_at, NOW())
            WHEN EXCLUDED.status IN ('pending', 'running') THEN NULL
            ELSE prism_agent_steps_l.completed_at
          END
        RETURNING
          step_id AS "stepId",
          run_id AS "runId",
          step_order AS "stepOrder",
          step_type AS "stepType",
          status,
          title,
          input_object_name AS "inputObjectName",
          output_object_name AS "outputObjectName",
          input_summary AS "inputSummary",
          output_summary AS "outputSummary",
          error_message AS "errorMessage",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          created_at AS "createdAt",
          NOT EXISTS (SELECT 1 FROM existing_step) AS "wasCreated"
      `,
      [
        params.workspaceId,
        params.runId,
        params.stepId ?? null,
        params.stepOrder,
        params.stepType,
        params.status,
        params.title,
        params.inputObjectName ?? null,
        params.outputObjectName ?? null,
        params.inputSummary ?? null,
        params.outputSummary ?? null,
        params.errorMessage ?? null,
      ],
    );

    const step = steps[0];
    if (!step) {
      return null;
    }

    const { wasCreated, ...row } = step;
    return { step: row, wasCreated };
  }

  async findAgentStepsByRunId(
    workspaceId: string,
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
        WHERE r.workspace_id = $1
          AND s.run_id = $2
        ORDER BY s.step_order ASC,
                 s.step_id ASC
      `,
      [workspaceId, runId],
    );
  }

  async findAgentActionsByRunId(
    workspaceId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentActionRow[]> {
    return this.getManager(manager).query<AgentActionRow[]>(
      `
        SELECT
          a.action_id AS "actionId",
          a.run_id AS "runId",
          a.step_id AS "stepId",
          a.workspace_id AS "workspaceId",
          a.action_type AS "actionType",
          a.target_type AS "targetType",
          a.target_id AS "targetId",
          a.status,
          a.reasoning_summary AS "reasoningSummary",
          a.payload_object_name AS "payloadObjectName",
          a.result_object_name AS "resultObjectName",
          a.requires_approval AS "requiresApproval",
          a.approved_by_user_id AS "approvedByUserId",
          a.approved_at AS "approvedAt",
          a.executed_at AS "executedAt",
          a.error_message AS "errorMessage",
          a.created_at AS "createdAt"
        FROM prism_agent_actions_l a
               INNER JOIN prism_agent_runs_l r
                          ON r.run_id = a.run_id
                         AND r.workspace_id = a.workspace_id
        WHERE r.workspace_id = $1
          AND a.run_id = $2
        ORDER BY a.created_at ASC,
                 a.action_id ASC
      `,
      [workspaceId, runId],
    );
  }

  async findAgentActionById(
    workspaceId: string,
    actionId: string,
    manager?: EntityManager,
  ): Promise<AgentActionRow | null> {
    const actions = await this.getManager(manager).query<AgentActionRow[]>(
      `
        SELECT
          a.action_id AS "actionId",
          a.run_id AS "runId",
          a.step_id AS "stepId",
          a.workspace_id AS "workspaceId",
          a.action_type AS "actionType",
          a.target_type AS "targetType",
          a.target_id AS "targetId",
          a.status,
          a.reasoning_summary AS "reasoningSummary",
          a.payload_object_name AS "payloadObjectName",
          a.result_object_name AS "resultObjectName",
          a.requires_approval AS "requiresApproval",
          a.approved_by_user_id AS "approvedByUserId",
          a.approved_at AS "approvedAt",
          a.executed_at AS "executedAt",
          a.error_message AS "errorMessage",
          a.created_at AS "createdAt"
        FROM prism_agent_actions_l a
        WHERE a.workspace_id = $1
          AND a.action_id = $2
        LIMIT 1
      `,
      [workspaceId, actionId],
    );

    return actions[0] ?? null;
  }

  async upsertAgentAction(
    params: UpsertAgentActionParams,
    manager?: EntityManager,
  ): Promise<UpsertAgentActionResult | null> {
    const actions = await this.getManager(manager).query<
      Array<AgentActionRow & { wasCreated: boolean }>
    >(
      `
        WITH existing_action AS (
          SELECT action_id
          FROM prism_agent_actions_l
          WHERE workspace_id = $1
            AND action_id = $3::uuid
        ),
        validated_action AS (
          SELECT
            COALESCE($3::uuid, gen_random_uuid()) AS action_id
          WHERE EXISTS (
            SELECT 1
            FROM prism_agent_runs_l r
            WHERE r.workspace_id = $1
              AND r.run_id = $2
          )
            AND (
              $4::uuid IS NULL
              OR EXISTS (
                SELECT 1
                FROM prism_agent_steps_l s
                WHERE s.run_id = $2
                  AND s.step_id = $4
              )
            )
        )
        INSERT INTO prism_agent_actions_l (
          action_id,
          run_id,
          step_id,
          workspace_id,
          action_type,
          target_type,
          target_id,
          status,
          reasoning_summary,
          payload_object_name,
          result_object_name,
          requires_approval,
          approved_by_user_id,
          approved_at,
          executed_at,
          error_message
        )
        SELECT
          validated_action.action_id,
          $2,
          $4,
          $1,
          $5,
          $6,
          $7,
          $8::text,
          $9,
          $10,
          $11,
          $12,
          $13,
          CASE WHEN $8::text = 'approved' AND $13::uuid IS NOT NULL THEN NOW() ELSE NULL END,
          COALESCE($14::timestamptz, CASE WHEN $8::text = 'executed' THEN NOW() ELSE NULL END),
          $15
        FROM validated_action
        ON CONFLICT (action_id)
        DO UPDATE SET
          step_id = EXCLUDED.step_id,
          action_type = EXCLUDED.action_type,
          target_type = EXCLUDED.target_type,
          target_id = EXCLUDED.target_id,
          status = EXCLUDED.status,
          reasoning_summary = EXCLUDED.reasoning_summary,
          payload_object_name = EXCLUDED.payload_object_name,
          result_object_name = EXCLUDED.result_object_name,
          requires_approval = EXCLUDED.requires_approval,
          approved_by_user_id = EXCLUDED.approved_by_user_id,
          approved_at = CASE
            WHEN EXCLUDED.approved_by_user_id IS NOT NULL
              AND (
                prism_agent_actions_l.approved_at IS NULL
                OR prism_agent_actions_l.approved_by_user_id IS DISTINCT FROM EXCLUDED.approved_by_user_id
              )
              THEN NOW()
            ELSE prism_agent_actions_l.approved_at
          END,
          executed_at = EXCLUDED.executed_at,
          error_message = EXCLUDED.error_message
        WHERE prism_agent_actions_l.workspace_id = $1
          AND prism_agent_actions_l.run_id = $2
        RETURNING
          action_id AS "actionId",
          run_id AS "runId",
          step_id AS "stepId",
          workspace_id AS "workspaceId",
          action_type AS "actionType",
          target_type AS "targetType",
          target_id AS "targetId",
          status,
          reasoning_summary AS "reasoningSummary",
          payload_object_name AS "payloadObjectName",
          result_object_name AS "resultObjectName",
          requires_approval AS "requiresApproval",
          approved_by_user_id AS "approvedByUserId",
          approved_at AS "approvedAt",
          executed_at AS "executedAt",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          NOT EXISTS (SELECT 1 FROM existing_action) AS "wasCreated"
      `,
      [
        params.workspaceId,
        params.runId,
        params.actionId ?? null,
        params.stepId ?? null,
        params.actionType,
        params.targetType,
        params.targetId ?? null,
        params.status,
        params.reasoningSummary ?? null,
        params.payloadObjectName ?? null,
        params.resultObjectName ?? null,
        params.requiresApproval,
        params.approvedByUserId ?? null,
        params.executedAt ?? null,
        params.errorMessage ?? null,
      ],
    );

    const action = actions[0];
    if (!action) {
      return null;
    }

    const { wasCreated, ...row } = action;
    return { action: row, wasCreated };
  }

  async approveAgentAction(
    params: ApproveAgentActionParams,
    manager?: EntityManager,
  ): Promise<AgentActionRow | null> {
    const actions = await this.getManager(manager).query<AgentActionRow[]>(
      `
        UPDATE prism_agent_actions_l
        SET
          status = 'approved',
          approved_by_user_id = $3,
          approved_at = NOW()
        WHERE workspace_id = $1
          AND action_id = $2
          AND requires_approval = TRUE
          AND status = ANY($4::text[])
        RETURNING
          action_id AS "actionId",
          run_id AS "runId",
          step_id AS "stepId",
          workspace_id AS "workspaceId",
          action_type AS "actionType",
          target_type AS "targetType",
          target_id AS "targetId",
          status,
          reasoning_summary AS "reasoningSummary",
          payload_object_name AS "payloadObjectName",
          result_object_name AS "resultObjectName",
          requires_approval AS "requiresApproval",
          approved_by_user_id AS "approvedByUserId",
          approved_at AS "approvedAt",
          executed_at AS "executedAt",
          error_message AS "errorMessage",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.actionId,
        params.approvedByUserId,
        params.approvableStatuses,
      ],
    );

    return actions[0] ?? null;
  }

  async cancelAgentAction(
    params: CancelAgentActionParams,
    manager?: EntityManager,
  ): Promise<AgentActionRow | null> {
    const actions = await this.getManager(manager).query<AgentActionRow[]>(
      `
        UPDATE prism_agent_actions_l
        SET status = 'cancelled'
        WHERE workspace_id = $1
          AND action_id = $2
          AND status = ANY($3::text[])
          AND executed_at IS NULL
        RETURNING
          action_id AS "actionId",
          run_id AS "runId",
          step_id AS "stepId",
          workspace_id AS "workspaceId",
          action_type AS "actionType",
          target_type AS "targetType",
          target_id AS "targetId",
          status,
          reasoning_summary AS "reasoningSummary",
          payload_object_name AS "payloadObjectName",
          result_object_name AS "resultObjectName",
          requires_approval AS "requiresApproval",
          approved_by_user_id AS "approvedByUserId",
          approved_at AS "approvedAt",
          executed_at AS "executedAt",
          error_message AS "errorMessage",
          created_at AS "createdAt"
      `,
      [params.workspaceId, params.actionId, params.cancellableStatuses],
    );

    return actions[0] ?? null;
  }

  async findAgentActionEventsByActionId(
    actionId: string,
    manager?: EntityManager,
  ): Promise<AgentActionEventRow[]> {
    return this.getManager(manager).query<AgentActionEventRow[]>(
      `
        SELECT
          event_id AS "eventId",
          action_id AS "actionId",
          actor_user_id AS "actorUserId",
          event_type AS "eventType",
          message,
          event_object_name AS "eventObjectName",
          created_at AS "createdAt"
        FROM prism_agent_action_events_l
        WHERE action_id = $1
        ORDER BY created_at ASC,
                 event_id ASC
      `,
      [actionId],
    );
  }

  async findAgentActionEventsByRunId(
    workspaceId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentActionEventRow[]> {
    return this.getManager(manager).query<AgentActionEventRow[]>(
      `
        SELECT
          e.event_id AS "eventId",
          e.action_id AS "actionId",
          e.actor_user_id AS "actorUserId",
          e.event_type AS "eventType",
          e.message,
          e.event_object_name AS "eventObjectName",
          e.created_at AS "createdAt"
        FROM prism_agent_action_events_l e
               INNER JOIN prism_agent_actions_l a
                          ON a.action_id = e.action_id
               INNER JOIN prism_agent_runs_l r
                          ON r.run_id = a.run_id
                         AND r.workspace_id = a.workspace_id
        WHERE r.workspace_id = $1
          AND r.run_id = $2
        ORDER BY e.created_at ASC,
                 e.event_id ASC
      `,
      [workspaceId, runId],
    );
  }

  async createAgentActionEvent(
    params: CreateAgentActionEventParams,
    manager?: EntityManager,
  ): Promise<AgentActionEventRow> {
    const events = await this.getManager(manager).query<AgentActionEventRow[]>(
      `
        INSERT INTO prism_agent_action_events_l (
          action_id,
          actor_user_id,
          event_type,
          message,
          event_object_name
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          event_id AS "eventId",
          action_id AS "actionId",
          actor_user_id AS "actorUserId",
          event_type AS "eventType",
          message,
          event_object_name AS "eventObjectName",
          created_at AS "createdAt"
      `,
      [
        params.actionId,
        params.actorUserId ?? null,
        params.eventType,
        params.message ?? null,
        params.eventObjectName ?? null,
      ],
    );

    return events[0];
  }

  async findWorkItemById(
    workspaceId: string,
    workItemId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkItemRow | null> {
    const workItems = await this.getManager(manager).query<AgentWorkItemRow[]>(
      `
        SELECT
          item_id AS "itemId"
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND item_id = $2
        LIMIT 1
      `,
      [workspaceId, workItemId],
    );

    return workItems[0] ?? null;
  }

  async upsertAgentMemory(
    params: UpsertAgentMemoryParams,
    manager?: EntityManager,
  ): Promise<AgentMemoryRow | null> {
    const memories = await this.getManager(manager).query<AgentMemoryRow[]>(
      `
        WITH input_memory AS (
          SELECT
            COALESCE($2::uuid, gen_random_uuid()) AS memory_id,
            $3::uuid AS requested_run_id,
            $4::uuid AS step_id
        ),
        matched_step AS (
          SELECT
            s.step_id,
            s.run_id
          FROM input_memory
                 INNER JOIN prism_agent_steps_l s
                            ON s.step_id = input_memory.step_id
                 INNER JOIN prism_agent_runs_l r
                            ON r.run_id = s.run_id
                           AND r.workspace_id = $1
          WHERE input_memory.step_id IS NOT NULL
            AND (
              input_memory.requested_run_id IS NULL
              OR s.run_id = input_memory.requested_run_id
            )
        ),
        validated_memory AS (
          SELECT
            input_memory.memory_id,
            COALESCE(input_memory.requested_run_id, matched_step.run_id) AS run_id,
            input_memory.step_id
          FROM input_memory
                 LEFT JOIN matched_step
                           ON matched_step.step_id = input_memory.step_id
          WHERE (
            input_memory.requested_run_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM prism_agent_runs_l r
              WHERE r.workspace_id = $1
                AND r.run_id = input_memory.requested_run_id
            )
          )
            AND (
              input_memory.step_id IS NULL
              OR matched_step.step_id IS NOT NULL
            )
        )
        INSERT INTO prism_agent_memories_l (
          memory_id,
          workspace_id,
          run_id,
          step_id,
          memory_type,
          title,
          content,
          content_hash
        )
        SELECT
          validated_memory.memory_id,
          $1,
          validated_memory.run_id,
          validated_memory.step_id,
          $5,
          $6,
          $7,
          $8
        FROM validated_memory
        ON CONFLICT (memory_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          run_id = EXCLUDED.run_id,
          step_id = EXCLUDED.step_id,
          memory_type = EXCLUDED.memory_type,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash
        WHERE prism_agent_memories_l.workspace_id = $1
        RETURNING
          memory_id AS "memoryId",
          workspace_id AS "workspaceId",
          run_id AS "runId",
          step_id AS "stepId",
          memory_type AS "memoryType",
          title,
          content,
          content_hash AS "contentHash",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.memoryId ?? null,
        params.runId ?? null,
        params.stepId ?? null,
        params.memoryType,
        params.title ?? null,
        params.content,
        params.contentHash,
      ],
    );

    return memories[0] ?? null;
  }

  async findAgentMemoryById(
    workspaceId: string,
    memoryId: string,
    manager?: EntityManager,
  ): Promise<Pick<AgentMemoryRow, 'memoryId'> | null> {
    const memories = await this.getManager(manager).query<
      Array<Pick<AgentMemoryRow, 'memoryId'>>
    >(
      `
        SELECT memory_id AS "memoryId"
        FROM prism_agent_memories_l
        WHERE workspace_id = $1
          AND memory_id = $2
        LIMIT 1
      `,
      [workspaceId, memoryId],
    );

    return memories[0] ?? null;
  }

  async findAgentMemoriesByRunId(
    workspaceId: string,
    runId: string,
    manager?: EntityManager,
  ): Promise<AgentMemoryRow[]> {
    return this.getManager(manager).query<AgentMemoryRow[]>(
      `
        SELECT
          memory_id AS "memoryId",
          workspace_id AS "workspaceId",
          run_id AS "runId",
          step_id AS "stepId",
          memory_type AS "memoryType",
          title,
          content,
          content_hash AS "contentHash",
          created_at AS "createdAt"
        FROM prism_agent_memories_l
        WHERE workspace_id = $1
          AND run_id = $2
        ORDER BY created_at ASC,
                 memory_id ASC
      `,
      [workspaceId, runId],
    );
  }

  async upsertAgentMemoryEmbedding(
    params: UpsertAgentMemoryEmbeddingParams,
    manager?: EntityManager,
  ): Promise<AgentMemoryEmbeddingRow | null> {
    const embeddings = await this.getManager(manager).query<
      AgentMemoryEmbeddingRow[]
    >(
      `
        WITH input_embedding AS (
          SELECT
            (
              SELECT ('[' || string_agg(embedding_value.value, ',' ORDER BY embedding_value.ordinality) || ']')::vector
              FROM jsonb_array_elements_text($6::jsonb) WITH ORDINALITY AS embedding_value(value, ordinality)
            ) AS embedding
        )
        INSERT INTO prism_agent_memory_embeddings_l (
          memory_id,
          workspace_id,
          embedding,
          model,
          dimensions,
          content_hash
        )
        SELECT
          m.memory_id,
          m.workspace_id,
          input_embedding.embedding,
          $3,
          $4,
          $5
        FROM prism_agent_memories_l m
               CROSS JOIN input_embedding
        WHERE m.workspace_id = $1
          AND m.memory_id = $2
          AND m.content_hash = $5
        ON CONFLICT (memory_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          embedding = EXCLUDED.embedding,
          model = EXCLUDED.model,
          dimensions = EXCLUDED.dimensions,
          content_hash = EXCLUDED.content_hash,
          embedded_at = NOW()
        RETURNING
          memory_id AS "memoryId",
          workspace_id AS "workspaceId",
          model,
          dimensions,
          content_hash AS "contentHash",
          created_at AS "createdAt",
          embedded_at AS "embeddedAt"
      `,
      [
        params.workspaceId,
        params.memoryId,
        params.model,
        params.dimensions,
        params.contentHash,
        JSON.stringify(params.embedding),
      ],
    );

    return embeddings[0] ?? null;
  }

  private mapAgentRunRow(row: AgentRunDbRow): AgentRunRow {
    return {
      runId: row.runId,
      workspaceId: row.workspaceId,
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
