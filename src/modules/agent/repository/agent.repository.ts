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
  CreateAgentRunParams,
  SearchAgentRunsParams,
  SearchAgentRunsResult,
  UpsertAgentMemoryEmbeddingParams,
  UpsertAgentMemoryParams,
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
