import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SprintWorkspaceAccessRow,
  SprintRow,
  SprintStatus,
  SprintWorkspaceRow,
} from '@/modules/sprint/types';
import type {
  SearchWorkItemsParams,
  SearchWorkItemsResult,
  WorkItemPriority,
  WorkItemStatus,
} from '@/modules/project/types';

@Injectable()
export class SprintRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findWorkspaceByIdAndAdminMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SprintWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      SprintWorkspaceRow[]
    >(
      `
        SELECT
          w.workspace_id AS "workspaceId"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND wm.role IN ('owner', 'admin')
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspaceByIdAndMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SprintWorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<
      SprintWorkspaceRow[]
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

  async findWorkspaceAccessByIdAndUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SprintWorkspaceAccessRow | null> {
    const workspaces = await this.getManager(manager).query<
      SprintWorkspaceAccessRow[]
    >(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          wm.role
        FROM prism_workspaces_l w
               LEFT JOIN prism_workspace_members_l wm
                         ON wm.workspace_id = w.workspace_id
                           AND wm.user_id = $2
        WHERE w.workspace_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async createSprint(
    params: {
      workspaceId: string;
      name: string;
      goal?: string;
      startsAt: Date;
      endsAt: Date;
      status: SprintStatus;
      createdBy: string;
    },
    manager?: EntityManager,
  ): Promise<SprintRow> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        INSERT INTO prism_sprints_l (
          workspace_id,
          sprint_name,
          goal,
          starts_at,
          ends_at,
          status,
          created_by,
          closed_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          CASE WHEN $8 THEN NOW() ELSE NULL END
        )
        RETURNING
          sprint_id AS "sprintId",
          workspace_id AS "workspaceId",
          sprint_name AS "name",
          goal,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          CASE
            WHEN NOW() < starts_at THEN 'planned'
            WHEN NOW() <= ends_at THEN 'active'
            ELSE 'closed'
          END AS "status",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.name,
        params.goal ?? null,
        params.startsAt,
        params.endsAt,
        params.status,
        params.createdBy,
        params.status === 'closed',
      ],
    );

    return sprints[0];
  }

  async findSprintById(
    workspaceId: string,
    sprintId: string,
    manager?: EntityManager,
  ): Promise<SprintRow | null> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        SELECT
          sprint_id AS "sprintId",
          workspace_id AS "workspaceId",
          sprint_name AS "name",
          goal,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          CASE
            WHEN NOW() < starts_at THEN 'planned'
            WHEN NOW() <= ends_at THEN 'active'
            ELSE 'closed'
          END AS "status",
          created_at AS "createdAt"
        FROM prism_sprints_l
        WHERE workspace_id = $1
          AND sprint_id = $2
        LIMIT 1
      `,
      [workspaceId, sprintId],
    );

    return sprints[0] ?? null;
  }

  async findSprintsByWorkspaceId(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<SprintRow[]> {
    return this.getManager(manager).query<SprintRow[]>(
      `
        SELECT
          sprint_id AS "sprintId",
          workspace_id AS "workspaceId",
          sprint_name AS "name",
          goal,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          CASE
            WHEN NOW() < starts_at THEN 'planned'
            WHEN NOW() <= ends_at THEN 'active'
            ELSE 'closed'
          END AS "status",
          created_at AS "createdAt"
        FROM prism_sprints_l
        WHERE workspace_id = $1
        ORDER BY starts_at DESC, sprint_id DESC
      `,
      [workspaceId],
    );
  }

  async searchSprintWorkItems(
    params: Omit<SearchWorkItemsParams, 'projectId'> & { sprintId: string },
    manager?: EntityManager,
  ): Promise<SearchWorkItemsResult> {
    type SearchSprintWorkItemRow = {
      itemId: string | null;
      workspaceId: string | null;
      projectId: string | null;
      parentId: string | null;
      title: string | null;
      description: string | null;
      startDate: string | null;
      dueDate: string | null;
      priority: WorkItemPriority | null;
      status: WorkItemStatus | null;
      sortOrder: number | null;
      statusChangedAt: Date | null;
      createdAt: Date | null;
      assigneeUsernames: string[];
      labelNames: string[];
      total: number;
    };

    const rows = await this.getManager(manager).query<
      SearchSprintWorkItemRow[]
    >(
      `
        WITH filtered_items AS (
          SELECT
            wi.item_id,
            wi.workspace_id,
            wi.project_id,
            wi.parent_id,
            wi.title,
            wi.description,
            wi.start_date,
            wi.due_date,
            wi.priority,
            wi.status,
            wi.sort_order,
            wi.status_changed_at,
            wi.created_at
          FROM prism_sprint_work_item_map swim
                 INNER JOIN prism_work_items_l wi
                            ON wi.workspace_id = swim.workspace_id
                           AND wi.project_id = swim.project_id
                           AND wi.item_id = swim.item_id
          WHERE swim.workspace_id = $1
            AND swim.sprint_id = $2
            AND wi.deleted_at IS NULL
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
          ORDER BY sort_order ASC, created_at DESC, item_id DESC
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
          pi.start_date AS "startDate",
          pi.due_date AS "dueDate",
          pi.priority,
          pi.status,
          pi.sort_order AS "sortOrder",
          pi.status_changed_at AS "statusChangedAt",
          pi.created_at AS "createdAt",
          COALESCE(
            (
              SELECT array_agg(u.username ORDER BY wimm.position)
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
        ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at DESC NULLS LAST, pi.item_id DESC NULLS LAST
      `,
      [
        params.workspaceId,
        params.sprintId,
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
          (row): row is SearchSprintWorkItemRow & { itemId: string } =>
            row.itemId !== null,
        )
        .map((row) => ({
          itemId: row.itemId,
          workspaceId: row.workspaceId as string,
          projectId: row.projectId as string,
          parentId: row.parentId,
          title: row.title as string,
          description: row.description as string,
          startDate: row.startDate,
          dueDate: row.dueDate,
          priority: row.priority as WorkItemPriority,
          status: row.status as WorkItemStatus,
          sortOrder: row.sortOrder as number,
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

  async getNextSprintNumber(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const rows = await this.getManager(manager).query<[{ next: string }]>(
      `
        SELECT COALESCE(MAX(
          CASE
            WHEN sprint_name ~ '^Sprint #[0-9]+$'
            THEN SUBSTRING(sprint_name FROM 9)::INTEGER
            ELSE 0
          END
        ), 0) + 1 AS next
        FROM prism_sprints_l
        WHERE workspace_id = $1
      `,
      [workspaceId],
    );

    return Number(rows[0]?.next ?? 1);
  }

  async findWorkItemsInSprintRange(
    workspaceId: string,
    startsAt: Date,
    endsAt: Date,
    manager?: EntityManager,
  ): Promise<Array<{ itemId: string; projectId: string }>> {
    return this.getManager(manager).query<
      Array<{ itemId: string; projectId: string }>
    >(
      `
        SELECT item_id AS "itemId", project_id AS "projectId"
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND archived_at IS NULL
          AND (
            (start_date IS NOT NULL AND due_date IS NOT NULL AND start_date <= $3 AND due_date >= $2)
            OR (start_date IS NOT NULL AND due_date IS NULL AND start_date BETWEEN $2 AND $3)
            OR (start_date IS NULL AND due_date IS NOT NULL AND due_date BETWEEN $2 AND $3)
          )
      `,
      [workspaceId, startsAt, endsAt],
    );
  }

  async findWorkItemsByIds(
    workspaceId: string,
    itemIds: string[],
    manager?: EntityManager,
  ): Promise<Array<{ itemId: string; projectId: string }>> {
    if (itemIds.length === 0) return [];

    const placeholders = itemIds.map((_, i) => `$${i + 2}`).join(', ');

    return this.getManager(manager).query<
      Array<{ itemId: string; projectId: string }>
    >(
      `
        SELECT item_id AS "itemId", project_id AS "projectId"
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND item_id IN (${placeholders})
          AND archived_at IS NULL
      `,
      [workspaceId, ...itemIds],
    );
  }

  async addSprintWorkItems(
    params: {
      workspaceId: string;
      sprintId: string;
      items: Array<{ itemId: string; projectId: string }>;
      addedBy: string;
    },
    manager?: EntityManager,
  ): Promise<void> {
    if (params.items.length === 0) return;

    const values = params.items
      .map(
        (_, i) =>
          `($1, $2, $${3 + i * 2}, $${4 + i * 2}, $${3 + params.items.length * 2})`,
      )
      .join(', ');

    const flatParams: unknown[] = [
      params.workspaceId,
      params.sprintId,
      ...params.items.flatMap((item) => [item.projectId, item.itemId]),
      params.addedBy,
    ];

    await this.getManager(manager).query(
      `
        INSERT INTO prism_sprint_work_item_map
          (workspace_id, sprint_id, project_id, item_id, added_by)
        VALUES ${values}
      `,
      flatParams,
    );
  }

  async removeSprintWorkItem(
    workspaceId: string,
    sprintId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const result = await this.getManager(manager).query<
      Array<{ itemId: string }>
    >(
      `
        DELETE FROM prism_sprint_work_item_map
        WHERE workspace_id = $1
          AND sprint_id = $2
          AND item_id = $3
        RETURNING item_id AS "itemId"
      `,
      [workspaceId, sprintId, itemId],
    );

    return result.length > 0;
  }

  async updateSprintMetadata(
    params: {
      workspaceId: string;
      sprintId: string;
      name: string;
      goal: string | null;
      startsAt: Date;
      endsAt: Date;
    },
    manager?: EntityManager,
  ): Promise<SprintRow | null> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        UPDATE prism_sprints_l
        SET
          sprint_name = $3,
          goal = $4,
          starts_at = $5,
          ends_at = $6,
          updated_at = NOW()
        WHERE workspace_id = $1
          AND sprint_id = $2
        RETURNING
          sprint_id AS "sprintId",
          workspace_id AS "workspaceId",
          sprint_name AS "name",
          goal,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          CASE
            WHEN NOW() < $5 THEN 'planned'
            WHEN NOW() <= $6 THEN 'active'
            ELSE 'closed'
          END AS "status",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.sprintId,
        params.name,
        params.goal,
        params.startsAt,
        params.endsAt,
      ],
    );

    return sprints[0] ?? null;
  }

  async deleteSprint(
    workspaceId: string,
    sprintId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const sprints = await this.getManager(manager).query<
      Array<{ sprintId: string }>
    >(
      `
        DELETE FROM prism_sprints_l
        WHERE workspace_id = $1
          AND sprint_id = $2
        RETURNING sprint_id AS "sprintId"
      `,
      [workspaceId, sprintId],
    );

    return sprints.length > 0;
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
