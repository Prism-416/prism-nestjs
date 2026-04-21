import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  WorkItemAssigneeRow,
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

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
