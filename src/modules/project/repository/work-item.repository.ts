import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
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
