import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  ProjectJobIdRow,
  ProjectMemberRow,
  ProjectMemberListRow,
  ProjectRow,
  ProjectSummaryRow,
  ProjectWorkspaceMemberUserRow,
} from '@/modules/project/types';

@Injectable()
export class ProjectRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async existsWorkspaceByIdAndMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const workspaces = await this.getManager(manager).query<
      Array<{ workspaceId: string }>
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

    return workspaces.length > 0;
  }

  async existsWorkspaceBySlugAndMemberUserId(
    workspaceSlug: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const workspaces = await this.getManager(manager).query<
      Array<{ workspaceId: string }>
    >(
      `
        SELECT
          w.workspace_id AS "workspaceId"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.slug = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceSlug, userId],
    );

    return workspaces.length > 0;
  }

  async findProjectsByMemberUserId(
    userId: string,
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<ProjectSummaryRow[]> {
    return this.getManager(manager).query<ProjectSummaryRow[]>(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          p.name,
          p.slug,
          p.description,
          p.created_at AS "createdAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
                         AND wm.user_id = $1
               INNER JOIN prism_project_members_l pm
                          ON pm.workspace_id = p.workspace_id
                         AND pm.project_id = p.project_id
                         AND pm.user_id = $1
        WHERE w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.workspace_id = $2
        ORDER BY p.created_at DESC
      `,
      [userId, workspaceId],
    );
  }

  async findProjectsByWorkspaceSlugAndMemberUserId(
    userId: string,
    workspaceSlug: string,
    manager?: EntityManager,
  ): Promise<ProjectSummaryRow[]> {
    return this.getManager(manager).query<ProjectSummaryRow[]>(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          p.name,
          p.slug,
          p.description,
          p.created_at AS "createdAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
                         AND wm.user_id = $1
               INNER JOIN prism_project_members_l pm
                          ON pm.workspace_id = p.workspace_id
                         AND pm.project_id = p.project_id
                         AND pm.user_id = $1
        WHERE w.deleted_at IS NULL
          AND w.status = 'active'
          AND w.slug = $2
        ORDER BY p.created_at DESC
      `,
      [userId, workspaceSlug],
    );
  }

  async findProjectBySlugAndMemberUserId(
    userId: string,
    projectSlug: string,
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
        WHERE wm.user_id = $1
          AND p.slug = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [userId, projectSlug],
    );

    return projects[0] ?? null;
  }

  async findProjectByIdAndMemberUserId(
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
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

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
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async createProject(
    params: {
      workspaceSlug: string;
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
        WHERE w.slug = $1
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.deleted_at IS NULL
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
        params.workspaceSlug,
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

  async deleteProjectByIdAndAdminUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const deletedProjects = await this.getManager(manager).query<
      Array<{ projectId: string }>
    >(
      `
        DELETE FROM prism_projects_l p
        USING prism_workspaces_l w, prism_workspace_members_l wm
        WHERE p.project_id = $1
          AND w.workspace_id = p.workspace_id
          AND wm.workspace_id = p.workspace_id
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        RETURNING p.project_id AS "projectId"
      `,
      [projectId, userId],
    );

    return deletedProjects.length > 0;
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

  async findProjectJobsByIds(
    workspaceId: string,
    jobIds: string[],
    manager?: EntityManager,
  ): Promise<ProjectJobIdRow[]> {
    if (jobIds.length === 0) {
      return [];
    }

    return this.getManager(manager).query<ProjectJobIdRow[]>(
      `
        SELECT
          job_id AS "jobId"
        FROM prism_project_jobs_l
        WHERE workspace_id = $1
          AND job_id = ANY($2::uuid[])
      `,
      [workspaceId, jobIds],
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

  async findProjectMembersByProjectId(
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectMemberListRow[]> {
    return this.getManager(manager).query<ProjectMemberListRow[]>(
      `
        SELECT
          pm.member_id AS "memberId",
          pm.workspace_id AS "workspaceId",
          pm.project_id AS "projectId",
          pm.user_id AS "userId",
          u.full_name AS "fullName",
          u.username,
          COALESCE(
            array_agg(pj.name ORDER BY pj.name)
            FILTER (WHERE pj.name IS NOT NULL),
            ARRAY[]::text[]
          ) AS "jobNames",
          pm.assigned_at AS "assignedAt"
        FROM prism_project_members_l pm
               INNER JOIN prism_users_l u
                          ON u.user_id = pm.user_id
               LEFT JOIN prism_project_member_job_map pmjm
                         ON pmjm.member_id = pm.member_id
               LEFT JOIN prism_project_jobs_l pj
                         ON pj.job_id = pmjm.job_id
                        AND pj.workspace_id = pm.workspace_id
        WHERE pm.project_id = $1
        GROUP BY
          pm.member_id,
          pm.workspace_id,
          pm.project_id,
          pm.user_id,
          u.full_name,
          u.username,
          pm.assigned_at
        ORDER BY u.username ASC
      `,
      [projectId],
    );
  }

  async deleteProjectMemberById(
    workspaceId: string,
    projectId: string,
    memberId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const deletedMembers = await this.getManager(manager).query<
      Array<{ memberId: string }>
    >(
      `
        DELETE FROM prism_project_members_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND member_id = $3
        RETURNING member_id AS "memberId"
      `,
      [workspaceId, projectId, memberId],
    );

    return deletedMembers.length > 0;
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

    return this.getManager(manager).query<ProjectMemberRow[]>(
      `
        INSERT INTO prism_project_members_l (
          workspace_id,
          project_id,
          user_id
        )
        SELECT
          $1,
          $2,
          input.user_id
        FROM unnest($3::uuid[]) AS input(user_id)
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
      [params.workspaceId, params.projectId, params.userIds],
    );
  }

  async replaceProjectMemberJobs(
    params: {
      members: Array<{
        memberId: string;
        jobIds: string[];
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
        DELETE FROM prism_project_member_job_map
        WHERE member_id = ANY($1::uuid[])
      `,
      [memberIds],
    );

    const jobMappings = params.members.flatMap((member) =>
      member.jobIds.map((jobId) => ({
        memberId: member.memberId,
        jobId,
      })),
    );
    if (jobMappings.length === 0) {
      return;
    }

    const jobIds = jobMappings.map((mapping) => mapping.jobId);
    const mappedMemberIds = jobMappings.map((mapping) => mapping.memberId);

    await this.getManager(manager).query(
      `
        INSERT INTO prism_project_member_job_map (
          job_id,
          member_id
        )
        SELECT
          input.job_id,
          input.member_id
        FROM unnest(
          $1::uuid[],
          $2::uuid[]
        ) AS input(job_id, member_id)
      `,
      [jobIds, mappedMemberIds],
    );
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
