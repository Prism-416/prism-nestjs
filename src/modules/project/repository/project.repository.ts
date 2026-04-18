import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  ProjectMemberRow,
  ProjectRoleIdRow,
  ProjectRow,
  ProjectWorkspaceMemberUserRow,
} from '@/modules/project/types';

@Injectable()
export class ProjectRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndAdminUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<ProjectRow | null> {
    const projects = await this.getManager(manager).query<ProjectRow[]>(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          p.name,
          p.slug,
          p.description,
          p.timezone,
          p.locale,
          p.created_at AS "createdAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.archived_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async createProject(
    params: {
      workspaceId: string;
      adminUserId: string;
      name: string;
      slug: string;
      description?: string;
    },
    manager?: EntityManager,
  ): Promise<ProjectRow | null> {
    const projects = await this.getManager(manager).query<ProjectRow[]>(
      `
        INSERT INTO prism_projects_l (
          workspace_id,
          name,
          slug,
          description,
          timezone,
          locale
        )
        SELECT
          w.workspace_id,
          $3,
          $4,
          $5,
          w.timezone,
          w.locale
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.archived_at IS NULL
          AND w.status = 'active'
        RETURNING
          project_id AS "projectId",
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          timezone,
          locale,
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.adminUserId,
        params.name,
        params.slug,
        params.description ?? null,
      ],
    );

    return projects[0] ?? null;
  }

  async updateProject(
    params: {
      projectId: string;
      name: string;
      description: string | null;
      timezone: string;
      locale: string;
    },
    manager?: EntityManager,
  ): Promise<ProjectRow> {
    const projects = await this.getManager(manager).query<ProjectRow[]>(
      `
        UPDATE prism_projects_l
        SET name = $2,
            description = $3,
            timezone = $4,
            locale = $5
        WHERE project_id = $1
        RETURNING
          project_id AS "projectId",
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          timezone,
          locale,
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.name,
        params.description,
        params.timezone,
        params.locale,
      ],
    );

    return projects[0];
  }

  async findWorkspaceMembersByUserIds(
    workspaceId: string,
    userIds: string[],
    manager?: EntityManager,
  ): Promise<ProjectWorkspaceMemberUserRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.getManager(manager).query<ProjectWorkspaceMemberUserRow[]>(
      `
        SELECT
          wm.user_id AS "userId"
        FROM prism_workspace_members_l wm
        WHERE wm.workspace_id = $1
          AND wm.user_id = ANY($2::uuid[])
      `,
      [workspaceId, userIds],
    );
  }

  async findProjectRolesByIds(
    workspaceId: string,
    roleIds: string[],
    manager?: EntityManager,
  ): Promise<ProjectRoleIdRow[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return this.getManager(manager).query<ProjectRoleIdRow[]>(
      `
        SELECT
          role_id AS "roleId"
        FROM prism_project_roles_l
        WHERE workspace_id = $1
          AND role_id = ANY($2::uuid[])
      `,
      [workspaceId, roleIds],
    );
  }

  async createProjectMember(
    params: {
      workspaceId: string;
      projectId: string;
      userId: string;
    },
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_project_members_l (
          workspace_id,
          project_id,
          user_id
        )
        VALUES ($1, $2, $3)
      `,
      [params.workspaceId, params.projectId, params.userId],
    );
  }

  async upsertProjectMembers(
    params: {
      workspaceId: string;
      projectId: string;
      userIds: string[];
    },
    manager?: EntityManager,
  ): Promise<ProjectMemberRow[]> {
    if (params.userIds.length === 0) {
      return [];
    }

    const values = params.userIds.flatMap((userId) => [
      params.workspaceId,
      params.projectId,
      userId,
    ]);
    const placeholders = params.userIds
      .map((_, index) => {
        const offset = index * 3;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      })
      .join(', ');

    return this.getManager(manager).query<ProjectMemberRow[]>(
      `
        INSERT INTO prism_project_members_l (
          workspace_id,
          project_id,
          user_id
        )
        VALUES ${placeholders}
        ON CONFLICT (project_id, user_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id
        RETURNING
          member_id AS "memberId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          user_id AS "userId",
          assigned_at AS "assignedAt"
      `,
      values,
    );
  }

  async replaceProjectMemberRoles(
    params: {
      workspaceId: string;
      members: Array<{
        memberId: string;
        roleIds: string[];
      }>;
    },
    manager?: EntityManager,
  ): Promise<void> {
    if (params.members.length === 0) {
      return;
    }

    const memberIds = params.members.map((member) => member.memberId);
    await this.getManager(manager).query(
      `
        DELETE FROM prism_project_member_role_map
        WHERE workspace_id = $1
          AND member_id = ANY($2::uuid[])
      `,
      [params.workspaceId, memberIds],
    );

    const roleMappings = params.members.flatMap((member) =>
      member.roleIds.map((roleId) => ({
        memberId: member.memberId,
        roleId,
      })),
    );
    if (roleMappings.length === 0) {
      return;
    }

    const values = roleMappings.flatMap((mapping) => [
      params.workspaceId,
      mapping.roleId,
      mapping.memberId,
    ]);
    const placeholders = roleMappings
      .map((_, index) => {
        const offset = index * 3;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      })
      .join(', ');

    await this.getManager(manager).query(
      `
        INSERT INTO prism_project_member_role_map (
          workspace_id,
          role_id,
          member_id
        )
        VALUES ${placeholders}
      `,
      values,
    );
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
