import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SearchWorkItemsParams,
  SearchWorkItemsResult,
  WorkItemAssigneeRow,
  WorkItemDetailRow,
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
      projectId: string | null;
      parentId: string | null;
      title: string | null;
      description: string | null;
      type: WorkItemRow['type'] | null;
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
            wi.project_id,
            wi.parent_id,
            wi.title,
            wi.description,
            wi.type,
            wi.priority,
            wi.status,
            wi.status_changed_at,
            wi.created_at
          FROM prism_work_items_l wi
          WHERE wi.project_id = $1
            AND (
              $2::text IS NULL
              OR wi.title ILIKE '%' || $2 || '%'
              OR wi.description ILIKE '%' || $2 || '%'
            )
            AND ($3::uuid IS NULL OR wi.parent_id = $3)
            AND ($4::text IS NULL OR wi.type = $4)
            AND ($5::text IS NULL OR wi.priority = $5)
            AND ($6::text IS NULL OR wi.status = $6)
            AND (
              $7::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM prism_work_item_member_map wimm
                       INNER JOIN prism_project_members_l pm
                                  ON pm.project_id = wimm.project_id
                                 AND pm.member_id = wimm.member_id
                       INNER JOIN prism_users_l u
                                  ON u.user_id = pm.user_id
                WHERE wimm.project_id = wi.project_id
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
          pi.project_id AS "projectId",
          pi.parent_id AS "parentId",
          pi.title,
          pi.description,
          pi.type,
          pi.priority,
          pi.status,
          pi.status_changed_at AS "statusChangedAt",
          pi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_project_members_l pm
                                ON pm.project_id = wimm.project_id
                               AND pm.member_id = wimm.member_id
                     INNER JOIN prism_users_l u
                                ON u.user_id = pm.user_id
              WHERE wimm.project_id = pi.project_id
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
        params.projectId,
        params.query ?? null,
        params.parentId ?? null,
        params.type ?? null,
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
          projectId: row.projectId as string,
          parentId: row.parentId,
          title: row.title as string,
          description: row.description as string,
          type: row.type as WorkItemRow['type'],
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
        WHERE project_id = $1
          AND item_id = $2
        LIMIT 1
      `,
      [projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findWorkItemRecordById(
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<WorkItemRow | null> {
    const items = await this.getManager(manager).query<WorkItemRow[]>(
      `
        SELECT
          item_id AS "itemId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          type,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
        FROM prism_work_items_l
        WHERE project_id = $1
          AND item_id = $2
        LIMIT 1
      `,
      [projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findWorkItemDetailById(
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<WorkItemDetailRow | null> {
    const items = await this.getManager(manager).query<WorkItemDetailRow[]>(
      `
        SELECT
          wi.item_id AS "itemId",
          wi.project_id AS "projectId",
          wi.parent_id AS "parentId",
          wi.title,
          wi.description,
          wi.type,
          wi.priority,
          wi.status,
          wi.status_changed_at AS "statusChangedAt",
          wi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_project_members_l pm
                                ON pm.project_id = wimm.project_id
                               AND pm.member_id = wimm.member_id
                     INNER JOIN prism_users_l u
                                ON u.user_id = pm.user_id
              WHERE wimm.project_id = wi.project_id
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
        WHERE wi.project_id = $1
          AND wi.item_id = $2
        LIMIT 1
      `,
      [projectId, itemId],
    );

    return items[0] ?? null;
  }

  async findChildWorkItems(
    projectId: string,
    parentId: string,
    manager?: EntityManager,
  ): Promise<WorkItemDetailRow[]> {
    return this.getManager(manager).query<WorkItemDetailRow[]>(
      `
        SELECT
          wi.item_id AS "itemId",
          wi.project_id AS "projectId",
          wi.parent_id AS "parentId",
          wi.title,
          wi.description,
          wi.type,
          wi.priority,
          wi.status,
          wi.status_changed_at AS "statusChangedAt",
          wi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY u.username)
              FROM prism_work_item_member_map wimm
                     INNER JOIN prism_project_members_l pm
                                ON pm.project_id = wimm.project_id
                               AND pm.member_id = wimm.member_id
                     INNER JOIN prism_users_l u
                                ON u.user_id = pm.user_id
              WHERE wimm.project_id = wi.project_id
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
        WHERE wi.project_id = $1
          AND wi.parent_id = $2
        ORDER BY wi.created_at ASC, wi.item_id ASC
      `,
      [projectId, parentId],
    );
  }

  async createWorkItem(
    params: {
      projectId: string;
      parentId?: string;
      title: string;
      description: string;
      type: WorkItemRow['type'];
      priority: WorkItemPriority;
      status: WorkItemStatus;
    },
    manager?: EntityManager,
  ): Promise<WorkItemRow> {
    const items = await this.getManager(manager).query<WorkItemRow[]>(
      `
        INSERT INTO prism_work_items_l (
          project_id,
          parent_id,
          title,
          description,
          type,
          priority,
          status,
          status_changed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING
          item_id AS "itemId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          type,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.parentId ?? null,
        params.title,
        params.description,
        params.type,
        params.priority,
        params.status,
      ],
    );

    return items[0];
  }

  async updateWorkItem(
    params: {
      projectId: string;
      itemId: string;
      hasParentId: boolean;
      parentId: string | null;
      hasTitle: boolean;
      title: string | null;
      hasDescription: boolean;
      description: string | null;
      hasType: boolean;
      type: WorkItemRow['type'] | null;
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
          parent_id = CASE WHEN $3 THEN $4 ELSE parent_id END,
          title = CASE WHEN $5 THEN $6 ELSE title END,
          description = CASE WHEN $7 THEN $8 ELSE description END,
          type = CASE WHEN $9 THEN $10 ELSE type END,
          priority = CASE WHEN $11 THEN $12 ELSE priority END,
          status = CASE WHEN $13 THEN $14 ELSE status END,
          status_changed_at = CASE
                                WHEN $13 AND status <> $14 THEN NOW()
                                ELSE status_changed_at
                              END
        WHERE project_id = $1
          AND item_id = $2
        RETURNING
          item_id AS "itemId",
          project_id AS "projectId",
          parent_id AS "parentId",
          title,
          description,
          type,
          priority,
          status,
          status_changed_at AS "statusChangedAt",
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.itemId,
        params.hasParentId,
        params.parentId,
        params.hasTitle,
        params.title,
        params.hasDescription,
        params.description,
        params.hasType,
        params.type,
        params.hasPriority,
        params.priority,
        params.hasStatus,
        params.status,
      ],
    );

    return items[0];
  }

  async deleteWorkItem(
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const items = await this.getManager(manager).query<
      Array<{ itemId: string }>
    >(
      `
        DELETE FROM prism_work_items_l
        WHERE project_id = $1
          AND item_id = $2
        RETURNING item_id AS "itemId"
      `,
      [projectId, itemId],
    );

    return items.length > 0;
  }

  async findProjectMembersByUsernames(
    projectId: string,
    usernames: string[],
    manager?: EntityManager,
  ): Promise<WorkItemAssigneeRow[]> {
    if (usernames.length === 0) {
      return [];
    }

    return this.getManager(manager).query<WorkItemAssigneeRow[]>(
      `
        SELECT
          pm.member_id AS "memberId",
          u.username
        FROM prism_project_members_l pm
               INNER JOIN prism_users_l u
                          ON u.user_id = pm.user_id
        WHERE pm.project_id = $1
          AND u.username = ANY($2::text[])
        ORDER BY array_position($2::text[], u.username)
      `,
      [projectId, usernames],
    );
  }

  async createWorkItemAssignees(
    projectId: string,
    itemId: string,
    memberIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (memberIds.length === 0) {
      return;
    }

    await this.getManager(manager).query(
      `
        INSERT INTO prism_work_item_member_map (
          project_id,
          item_id,
          member_id
        )
        SELECT
          $1,
          $2,
          input.member_id
        FROM unnest($3::uuid[]) AS input(member_id)
      `,
      [projectId, itemId, memberIds],
    );
  }

  async replaceWorkItemAssignees(
    projectId: string,
    itemId: string,
    memberIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE FROM prism_work_item_member_map
        WHERE project_id = $1
          AND item_id = $2
      `,
      [projectId, itemId],
    );

    await this.createWorkItemAssignees(projectId, itemId, memberIds, manager);
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

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
