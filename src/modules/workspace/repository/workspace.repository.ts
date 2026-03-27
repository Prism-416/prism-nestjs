import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { WorkspaceMemberRow, WorkspaceRow } from '@/modules/workspace/types';

@Injectable()
export class WorkspaceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findWorkspaceByIdAndAdminUserId(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.dataSource.query<WorkspaceRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
        INNER JOIN prism_workspace_members_l wm
          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.archived_at IS NULL
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
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.dataSource.query<WorkspaceRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
        INNER JOIN prism_workspace_members_l wm
          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND w.archived_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspacesByMemberUserId(userId: string): Promise<WorkspaceRow[]> {
    return this.dataSource.query<WorkspaceRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
        INNER JOIN prism_workspace_members_l wm
          ON wm.workspace_id = w.workspace_id
        WHERE wm.user_id = $1
          AND w.archived_at IS NULL
          AND w.status = 'active'
        ORDER BY w.created_at DESC
      `,
      [userId],
    );
  }

  async findWorkspaceMembersByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceMemberRow[]> {
    return this.dataSource.query<WorkspaceMemberRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.full_name AS "fullName",
          u.username,
          wm.role,
          wm.joined_at AS "joinedAt",
          wm.invited_at AS "invitedAt"
        FROM prism_workspace_members_l wm
        INNER JOIN prism_users_l u
          ON u.user_id = wm.user_id
        WHERE wm.workspace_id = $1
        ORDER BY
          CASE wm.role
            WHEN 'admin' THEN 0
            WHEN 'member' THEN 1
            ELSE 2
          END,
          u.username ASC
      `,
      [workspaceId],
    );
  }

  async createWorkspace(
    params: {
      name: string;
      slug: string;
      description?: string;
      ownerId: string;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        INSERT INTO prism_workspaces_l (name, slug, description, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
      `,
      [params.name, params.slug, params.description ?? null, params.ownerId],
    );

    return workspaces[0];
  }

  async createOwnerMembership(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_workspace_members_l (workspace_id, user_id, role)
        VALUES ($1, $2, 'admin')
      `,
      [workspaceId, userId],
    );
  }

  async updateWorkspace(
    params: {
      workspaceId: string;
      name: string;
      description: string | null;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        UPDATE prism_workspaces_l
        SET name = $2,
            description = $3
        WHERE workspace_id = $1
        RETURNING
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
      `,
      [params.workspaceId, params.name, params.description],
    );

    return workspaces[0];
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
