import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SearchWorkItemsParams,
  SearchWorkItemsResult,
  UpsertWorkItemEmbeddingParams,
  WorkItemAssigneeRow,
  WorkItemDetailRow,
  WorkItemEmbeddingRow,
  WorkItemLabelRow,
  WorkItemPriority,
  WorkItemRow,
  WorkItemStatus,
} from '@/modules/project/types';

@Injectable()
export class WorkItemRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async searchWorkItems(
    params: SearchWorkItemsParams,
    manager?: EntityManager,
  ): Promise<SearchWorkItemsResult> {
    type SearchWorkItemRow = {
      itemId: string | null;
      workspaceId: string | null;
      projectId: string | null;
      parentId: string | null;
      title: string | null;
      description: string | null;
      priority: WorkItemPriority | null;
      status: WorkItemStatus | null;
      statusChangedAt: Date | null;
      createdAt: Date | null;
      assigneeUsernames: string[];
      labelNames: string[];
      total: number;
    };

    const rows = await this.getManager(manager).query<SearchWorkItemRow[]>(
      `
        WITH filtered_items AS (
          SELECT
            wi.item_id,
            wi.workspace_id,
            wi.project_id,
            wi.parent_id,
            wi.title,
            wi.description,
            wi.priority,
            wi.status,
            wi.status_changed_at,
            wi.created_at
          FROM prism_work_items_l wi
          WHERE wi.workspace_id = $1
            AND wi.project_id = $2
            AND (
              $3::text IS NULL
              OR wi.title ILIKE '%' || $3 || '%'
              OR wi.description ILIKE '%' || $3 || '%'
            )
            AND ($4::uuid IS NULL OR wi.parent_id = $4)
            AND ($5::text IS NULL OR wi.priority = $5)
            AND ($6::text IS NULL OR wi.status = $6)
            AND (
              $7::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM prism_work_item_member_map wimm
                       INNER JOIN prism_users_l u
                                  ON u.user_id = wimm.user_id
                WHERE wimm.workspace_id = wi.workspace_id
                  AND wimm.item_id = wi.item_id
                  AND u.username = $7
              )
            )
            AND (
              $8::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM prism_work_item_label_map wilm
                       INNER JOIN prism_work_item_labels_l wil
                                  ON wil.project_id = wilm.project_id
                                 AND wil.label_id = wilm.label_id
                WHERE wilm.project_id = wi.project_id
                  AND wilm.item_id = wi.item_id
                  AND wil.label = $8
              )
            )
        ),
        total_count AS (
          SELECT COUNT(*)::int AS total
          FROM filtered_items
        ),
        paged_items AS (
          SELECT *
          FROM filtered_items
          ORDER BY created_at DESC, item_id DESC
          LIMIT $9
          OFFSET $10
        )
        SELECT
          pi.item_id AS "itemId",
          pi.workspace_id AS "workspaceId",
          pi.project_id AS "projectId",
          pi.parent_id AS "parentId",
          pi.title,
          pi.description,
          pi.priority,
          pi.status,
          pi.status_changed_at AS "statusChangedAt",
          pi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_users_l u
                                ON u.user_id = wimm.user_id
              WHERE wimm.workspace_id = pi.workspace_id
                AND wimm.item_id = pi.item_id
            ),
            ARRAY[]::text[]
          ) AS "assigneeUsernames",
          COALESCE(
            (
              SELECT array_agg(wil.label ORDER BY wil.label)
              FROM prism_work_item_label_map wilm
                     INNER JOIN prism_work_item_labels_l wil
                                ON wil.project_id = wilm.project_id
                               AND wil.label_id = wilm.label_id
              WHERE wilm.project_id = pi.project_id
                AND wilm.item_id = pi.item_id
            ),
            ARRAY[]::text[]
          ) AS "labelNames",
          tc.total
        FROM total_count tc
               LEFT JOIN paged_items pi
                         ON TRUE
        ORDER BY pi.created_at DESC NULLS LAST, pi.item_id DESC NULLS LAST
      `,
      [
        params.workspaceId,
        params.projectId,
        params.query ?? null,
        params.parentId ?? null,
        params.priority ?? null,
        params.status ?? null,
        params.assigneeUsername ?? null,
        params.labelName ?? null,
        params.limit,
        params.offset,
      ],
    );

    return {
      items: rows
        .filter(
          (row): row is SearchWorkItemRow & { itemId: string } =>
            row.itemId !== null,
        )
        .map((row) => ({
          itemId: row.itemId,
          workspaceId: row.workspaceId as string,
          projectId: row.projectId as string,
          parentId: row.parentId,
          title: row.title as string,
          description: row.description as string,
          priority: row.priority as WorkItemPriority,
          status: row.status as WorkItemStatus,
          statusChangedAt: row.statusChangedAt as Date,
          createdAt: row.createdAt as Date,
          assigneeUsernames: row.assigneeUsernames,
          labelNames: row.labelNames,
        })),
      total: rows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async findWorkItemById(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<Pick<WorkItemRow, 'itemId'> | null> {
    const items = await this.getManager(manager).query<
      Array<Pick<WorkItemRow, 'itemId'>>
    >(
      `
        SELECT item_id AS "itemId"
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND item_id = $3
        LIMIT 1
      `,
      [workspaceId, projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findWorkItemRecordById(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<WorkItemRow | null> {
    const items = await this.getManager(manager).query<WorkItemRow[]>(
      `
        SELECT
          item_id AS "itemId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND item_id = $3
        LIMIT 1
      `,
      [workspaceId, projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findWorkItemDetailById(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<WorkItemDetailRow | null> {
    const items = await this.getManager(manager).query<WorkItemDetailRow[]>(
      `
        SELECT
          wi.item_id AS "itemId",
          wi.workspace_id AS "workspaceId",
          wi.project_id AS "projectId",
          wi.parent_id AS "parentId",
          wi.title,
          wi.description,
          wi.priority,
          wi.status,
          wi.status_changed_at AS "statusChangedAt",
          wi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_users_l u
                                ON u.user_id = wimm.user_id
              WHERE wimm.workspace_id = wi.workspace_id
                AND wimm.item_id = wi.item_id
            ),
            ARRAY[]::text[]
          ) AS "assigneeUsernames",
          COALESCE(
            (
              SELECT array_agg(wil.label ORDER BY wil.label)
              FROM prism_work_item_label_map wilm
                     INNER JOIN prism_work_item_labels_l wil
                                ON wil.project_id = wilm.project_id
                               AND wil.label_id = wilm.label_id
              WHERE wilm.project_id = wi.project_id
                AND wilm.item_id = wi.item_id
            ),
            ARRAY[]::text[]
          ) AS "labelNames"
        FROM prism_work_items_l wi
        WHERE wi.workspace_id = $1
          AND wi.project_id = $2
          AND wi.item_id = $3
        LIMIT 1
      `,
      [workspaceId, projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findChildWorkItems(
    workspaceId: string,
    projectId: string,
    parentId: string,
    manager?: EntityManager,
  ): Promise<WorkItemDetailRow[]> {
    return this.getManager(manager).query<WorkItemDetailRow[]>(
      `
        SELECT
          wi.item_id AS "itemId",
          wi.workspace_id AS "workspaceId",
          wi.project_id AS "projectId",
          wi.parent_id AS "parentId",
          wi.title,
          wi.description,
          wi.priority,
          wi.status,
          wi.status_changed_at AS "statusChangedAt",
          wi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_users_l u
                                ON u.user_id = wimm.user_id
              WHERE wimm.workspace_id = wi.workspace_id
                AND wimm.item_id = wi.item_id
            ),
            ARRAY[]::text[]
          ) AS "assigneeUsernames",
          COALESCE(
            (
              SELECT array_agg(wil.label ORDER BY wil.label)
              FROM prism_work_item_label_map wilm
                     INNER JOIN prism_work_item_labels_l wil
                                ON wil.project_id = wilm.project_id
                               AND wil.label_id = wilm.label_id
              WHERE wilm.project_id = wi.project_id
                AND wilm.item_id = wi.item_id
            ),
            ARRAY[]::text[]
          ) AS "labelNames"
        FROM prism_work_items_l wi
        WHERE wi.workspace_id = $1
          AND wi.project_id = $2
          AND wi.parent_id = $3
        ORDER BY wi.created_at ASC, wi.item_id ASC
      `,
      [workspaceId, projectId, parentId],
    );
  }

  async createWorkItem(
    params: {
      workspaceId: string;
      projectId: string;
      parentId?: string;
      title: string;
      description: string;
      priority: WorkItemPriority;
      status: WorkItemStatus;
      createdBy: string;
    },
    manager?: EntityManager,
  ): Promise<WorkItemRow> {
    const items = await this.getManager(manager).query<WorkItemRow[]>(
      `
        INSERT INTO prism_work_items_l (
          workspace_id,
          project_id,
          parent_id,
          title,
          description,
          priority,
          status,
          created_by,
          status_changed_at,
          archived_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          NOW(),
          CASE WHEN $9 THEN NOW() ELSE NULL END
        )
        RETURNING
          item_id AS "itemId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.parentId ?? null,
        params.title,
        params.description,
        params.priority,
        params.status,
        params.createdBy,
        params.status === 'archived',
      ],
    );

    return items[0];
  }

  async updateWorkItem(
    params: {
      workspaceId: string;
      projectId: string;
      itemId: string;
      hasParentId: boolean;
      parentId: string | null;
      hasTitle: boolean;
      title: string | null;
      hasDescription: boolean;
      description: string | null;
      hasPriority: boolean;
      priority: WorkItemPriority | null;
      hasStatus: boolean;
      status: WorkItemStatus | null;
    },
    manager?: EntityManager,
  ): Promise<WorkItemRow> {
    const items = await this.getManager(manager).query<WorkItemRow[]>(
      `
        UPDATE prism_work_items_l
        SET
          parent_id = CASE WHEN $4 THEN $5 ELSE parent_id END,
          title = CASE WHEN $6 THEN $7 ELSE title END,
          description = CASE WHEN $8 THEN $9 ELSE description END,
          priority = CASE WHEN $10 THEN $11 ELSE priority END,
          status = CASE WHEN $12 THEN $13 ELSE status END,
          status_changed_at = CASE
                                WHEN $12 AND status <> $13 THEN NOW()
                                ELSE status_changed_at
                              END,
          archived_at = CASE
                          WHEN $12 AND $14 AND archived_at IS NULL THEN NOW()
                          WHEN $12 AND NOT $14 THEN NULL
                          ELSE archived_at
                        END,
          updated_at = NOW()
        WHERE workspace_id = $1
          AND project_id = $2
          AND item_id = $3
        RETURNING
          item_id AS "itemId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.hasParentId,
        params.parentId,
        params.hasTitle,
        params.title,
        params.hasDescription,
        params.description,
        params.hasPriority,
        params.priority,
        params.hasStatus,
        params.status,
        params.status === 'archived',
      ],
    );

    return items[0];
  }

  async deleteWorkItem(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const items = await this.getManager(manager).query<
      Array<{ itemId: string }>
    >(
      `
        DELETE FROM prism_work_items_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND item_id = $3
        RETURNING item_id AS "itemId"
      `,
      [workspaceId, projectId, itemId],
    );

    return items.length > 0;
  }

  async findWorkspaceMembersByUsernames(
    workspaceId: string,
    usernames: string[],
    manager?: EntityManager,
  ): Promise<WorkItemAssigneeRow[]> {
    if (usernames.length === 0) {
      return [];
    }

    return this.getManager(manager).query<WorkItemAssigneeRow[]>(
      `
        SELECT
          wm.user_id AS "userId",
          u.username
        FROM prism_workspace_members_l wm
               INNER JOIN prism_users_l u
                          ON u.user_id = wm.user_id
        WHERE wm.workspace_id = $1
          AND u.username = ANY($2::text[])
        ORDER BY array_position($2::text[], u.username)
      `,
      [workspaceId, usernames],
    );
  }

  async createWorkItemAssignees(
    workspaceId: string,
    itemId: string,
    userIds: string[],
    assignedBy: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.getManager(manager).query(
      `
        INSERT INTO prism_work_item_member_map (
          workspace_id,
          item_id,
          user_id,
          assigned_by
        )
        SELECT
          $1,
          $2,
          input.user_id,
          $4
        FROM unnest($3::uuid[]) AS input(user_id)
      `,
      [workspaceId, itemId, userIds, assignedBy],
    );
  }

  async replaceWorkItemAssignees(
    workspaceId: string,
    itemId: string,
    userIds: string[],
    assignedBy: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE FROM prism_work_item_member_map
        WHERE workspace_id = $1
          AND item_id = $2
      `,
      [workspaceId, itemId],
    );

    await this.createWorkItemAssignees(
      workspaceId,
      itemId,
      userIds,
      assignedBy,
      manager,
    );
  }

  async ensureWorkItemLabels(
    projectId: string,
    labels: string[],
    manager?: EntityManager,
  ): Promise<WorkItemLabelRow[]> {
    if (labels.length === 0) {
      return [];
    }

    await this.getManager(manager).query(
      `
        INSERT INTO prism_work_item_labels_l (
          project_id,
          label
        )
        SELECT
          $1,
          input.label
        FROM unnest($2::text[]) AS input(label)
        ON CONFLICT (project_id, label)
        DO NOTHING
      `,
      [projectId, labels],
    );

    return this.getManager(manager).query<WorkItemLabelRow[]>(
      `
        SELECT
          label_id AS "labelId",
          label
        FROM prism_work_item_labels_l
        WHERE project_id = $1
          AND label = ANY($2::text[])
        ORDER BY array_position($2::text[], label)
      `,
      [projectId, labels],
    );
  }

  async createWorkItemLabels(
    projectId: string,
    itemId: string,
    labelIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (labelIds.length === 0) {
      return;
    }

    await this.getManager(manager).query(
      `
        INSERT INTO prism_work_item_label_map (
          project_id,
          item_id,
          label_id
        )
        SELECT
          $1,
          $2,
          input.label_id
        FROM unnest($3::uuid[]) AS input(label_id)
      `,
      [projectId, itemId, labelIds],
    );
  }

  async replaceWorkItemLabels(
    projectId: string,
    itemId: string,
    labelIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE FROM prism_work_item_label_map
        WHERE project_id = $1
          AND item_id = $2
      `,
      [projectId, itemId],
    );

    await this.createWorkItemLabels(projectId, itemId, labelIds, manager);
  }

  async upsertWorkItemEmbedding(
    params: UpsertWorkItemEmbeddingParams,
    manager?: EntityManager,
  ): Promise<WorkItemEmbeddingRow | null> {
    const embeddings = await this.getManager(manager).query<
      WorkItemEmbeddingRow[]
    >(
      `
        WITH input_embedding AS (
          SELECT
            (
              SELECT ('[' || string_agg(embedding_value.value, ',' ORDER BY embedding_value.ordinality) || ']')::vector
              FROM jsonb_array_elements_text($9::jsonb) WITH ORDINALITY AS embedding_value(value, ordinality)
            ) AS embedding
        )
        INSERT INTO prism_work_item_embeddings_l (
          item_id,
          workspace_id,
          project_id,
          embedding,
          embedded_title,
          embedded_description,
          content_hash,
          model,
          dimensions
        )
        SELECT
          wi.item_id,
          wi.workspace_id,
          wi.project_id,
          input_embedding.embedding,
          $4,
          $5,
          $6,
          $7,
          $8
        FROM prism_work_items_l wi
               CROSS JOIN input_embedding
        WHERE wi.workspace_id = $1
          AND wi.project_id = $2
          AND wi.item_id = $3
          AND wi.title = $4
          AND wi.description = $5
        ON CONFLICT (item_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          project_id = EXCLUDED.project_id,
          embedding = EXCLUDED.embedding,
          embedded_title = EXCLUDED.embedded_title,
          embedded_description = EXCLUDED.embedded_description,
          content_hash = EXCLUDED.content_hash,
          model = EXCLUDED.model,
          dimensions = EXCLUDED.dimensions,
          embedded_at = NOW()
        RETURNING
          item_id AS "itemId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          embedded_title AS "embeddedTitle",
          embedded_description AS "embeddedDescription",
          content_hash AS "contentHash",
          model,
          dimensions,
          created_at AS "createdAt",
          embedded_at AS "embeddedAt"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.embeddedTitle,
        params.embeddedDescription,
        params.contentHash,
        params.model,
        params.dimensions,
        JSON.stringify(params.embedding),
      ],
    );

    return embeddings[0] ?? null;
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
