import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SprintProjectRow,
  SprintRow,
  SprintStatus,
} from '@/modules/sprint/types';
import type {
  SearchWorkItemsParams,
  SearchWorkItemsResult,
  WorkItemPriority,
  WorkItemRow,
  WorkItemStatus,
} from '@/modules/project/types';

@Injectable()
export class SprintRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndMemberUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SprintProjectRow | null> {
    const projects = await this.getManager(manager).query<SprintProjectRow[]>(
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

  async createSprint(
    params: {
      projectId: string;
      name: string;
      description?: string;
      startsAt: Date;
      endsAt: Date;
      status: SprintStatus;
    },
    manager?: EntityManager,
  ): Promise<SprintRow> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        INSERT INTO prism_sprints_l (
          project_id,
          sprint_name,
          description,
          starts_at,
          ends_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          sprint_id AS "sprintId",
          project_id AS "projectId",
          sprint_name AS "name",
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          status,
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.name,
        params.description ?? null,
        params.startsAt,
        params.endsAt,
        params.status,
      ],
    );

    return sprints[0];
  }

  async findSprintById(
    projectId: string,
    sprintId: string,
    manager?: EntityManager,
  ): Promise<SprintRow | null> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        SELECT
          sprint_id AS "sprintId",
          project_id AS "projectId",
          sprint_name AS "name",
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          status,
          created_at AS "createdAt"
        FROM prism_sprints_l
        WHERE project_id = $1
          AND sprint_id = $2
        LIMIT 1
      `,
      [projectId, sprintId],
    );

    return sprints[0] ?? null;
  }

  async findSprintsByProjectId(
    projectId: string,
    manager?: EntityManager,
  ): Promise<SprintRow[]> {
    return this.getManager(manager).query<SprintRow[]>(
      `
        SELECT
          sprint_id AS "sprintId",
          project_id AS "projectId",
          sprint_name AS "name",
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          status,
          created_at AS "createdAt"
        FROM prism_sprints_l
        WHERE project_id = $1
        ORDER BY starts_at DESC, sprint_id DESC
      `,
      [projectId],
    );
  }

  async searchSprintWorkItems(
    params: SearchWorkItemsParams & { sprintId: string },
    manager?: EntityManager,
  ): Promise<SearchWorkItemsResult> {
    type SearchSprintWorkItemRow = {
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

    const rows = await this.getManager(manager).query<
      SearchSprintWorkItemRow[]
    >(
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
          FROM prism_sprint_work_item_map swim
                 INNER JOIN prism_work_items_l wi
                            ON wi.project_id = swim.project_id
                           AND wi.item_id = swim.item_id
          WHERE swim.project_id = $1
            AND swim.sprint_id = $2
            AND (
              $3::text IS NULL
              OR wi.title ILIKE '%' || $3 || '%'
              OR wi.description ILIKE '%' || $3 || '%'
            )
            AND ($4::uuid IS NULL OR wi.parent_id = $4)
            AND ($5::text IS NULL OR wi.type = $5)
            AND ($6::text IS NULL OR wi.priority = $6)
            AND ($7::text IS NULL OR wi.status = $7)
            AND (
              $8::text IS NULL
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
                  AND u.username = $8
              )
            )
            AND (
              $9::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM prism_work_item_label_map wilm
                       INNER JOIN prism_work_item_labels_l wil
                                  ON wil.project_id = wilm.project_id
                                 AND wil.label_id = wilm.label_id
                WHERE wilm.project_id = wi.project_id
                  AND wilm.item_id = wi.item_id
                  AND wil.label = $9
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
          LIMIT $10
          OFFSET $11
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
        params.sprintId,
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
          (row): row is SearchSprintWorkItemRow & { itemId: string } =>
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

  async updateSprintMetadata(
    params: {
      projectId: string;
      sprintId: string;
      name: string;
      description: string | null;
      startsAt: Date;
      endsAt: Date;
      status: SprintStatus;
    },
    manager?: EntityManager,
  ): Promise<SprintRow | null> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        UPDATE prism_sprints_l
        SET
          sprint_name = $3,
          description = $4,
          starts_at = $5,
          ends_at = $6,
          status = $7
        WHERE project_id = $1
          AND sprint_id = $2
        RETURNING
          sprint_id AS "sprintId",
          project_id AS "projectId",
          sprint_name AS "name",
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          status,
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.sprintId,
        params.name,
        params.description,
        params.startsAt,
        params.endsAt,
        params.status,
      ],
    );

    return sprints[0] ?? null;
  }

  async deleteSprint(
    projectId: string,
    sprintId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const sprints = await this.getManager(manager).query<
      Array<{ sprintId: string }>
    >(
      `
        DELETE FROM prism_sprints_l
        WHERE project_id = $1
          AND sprint_id = $2
        RETURNING sprint_id AS "sprintId"
      `,
      [projectId, sprintId],
    );

    return sprints.length > 0;
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
