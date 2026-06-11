import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  ProjectGithubRepositoryLinkRow,
  ProjectRow,
  ProjectSummaryRow,
  ProjectWorkspaceMemberUserRow,
  WorkspaceRepositoryLinkRow,
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
        WHERE w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.workspace_id = $2
          AND p.status <> 'archived'
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
        WHERE w.deleted_at IS NULL
          AND w.status = 'active'
          AND w.slug = $2
          AND p.status <> 'archived'
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
          AND p.status <> 'archived'
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
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async findProjectById(
    projectId: string,
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
          p.created_at AS "createdAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId],
    );

    return projects[0] ?? null;
  }

  async findGithubRepositoryLinkByProjectId(
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectGithubRepositoryLinkRow | null> {
    const links = await this.getManager(manager).query<
      ProjectGithubRepositoryLinkRow[]
    >(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          link.link_id AS "workspaceRepositoryLinkId",
          link.github_installation_id::text AS "githubInstallationId",
          link.github_repository_id::text AS "githubRepositoryId",
          link.repository_owner AS "repositoryOwner",
          link.repository_name AS "repositoryName",
          link.repository_full_name AS "repositoryFullName",
          link.repository_url AS "repositoryUrl",
          link.default_branch AS "defaultBranch",
          link.visibility,
          prl.connected_by AS "connectedByUserId",
          prl.connected_at AS "connectedAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_project_repository_links_l prl
                          ON prl.project_id = p.project_id
               INNER JOIN prism_workspace_repository_links_l link
                          ON link.link_id = prl.workspace_repository_link_id
        WHERE p.project_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId],
    );

    return links[0] ?? null;
  }

  // Repositories are linked at workspace scope, so internal callers identify the
  // repository by full name and we resolve it through the project's workspace
  // without requiring a project-repository association.
  async findWorkspaceRepositoryLinkByProjectAndRepository(
    projectId: string,
    repositoryFullName: string,
    manager?: EntityManager,
  ): Promise<ProjectGithubRepositoryLinkRow | null> {
    const links = await this.getManager(manager).query<
      ProjectGithubRepositoryLinkRow[]
    >(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          link.link_id AS "workspaceRepositoryLinkId",
          link.github_installation_id::text AS "githubInstallationId",
          link.github_repository_id::text AS "githubRepositoryId",
          link.repository_owner AS "repositoryOwner",
          link.repository_name AS "repositoryName",
          link.repository_full_name AS "repositoryFullName",
          link.repository_url AS "repositoryUrl",
          link.default_branch AS "defaultBranch",
          link.visibility,
          link.connected_by AS "connectedByUserId",
          link.connected_at AS "connectedAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_repository_links_l link
                          ON link.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND link.repository_full_name = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId, repositoryFullName],
    );

    return links[0] ?? null;
  }

  async findGithubRepositoryLinkByInstallationRepository(
    params: {
      githubInstallationId: string;
      githubRepositoryId: string;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceRepositoryLinkRow | null> {
    const links = await this.getManager(manager).query<
      WorkspaceRepositoryLinkRow[]
    >(
      `
        SELECT
          prl.project_id AS "projectId",
          link.workspace_id AS "workspaceId",
          link.link_id AS "workspaceRepositoryLinkId",
          link.github_installation_id::text AS "githubInstallationId",
          link.github_repository_id::text AS "githubRepositoryId",
          link.repository_owner AS "repositoryOwner",
          link.repository_name AS "repositoryName",
          link.repository_full_name AS "repositoryFullName",
          link.repository_url AS "repositoryUrl",
          link.default_branch AS "defaultBranch",
          link.visibility,
          link.connected_by AS "connectedByUserId",
          link.connected_at AS "connectedAt"
        FROM prism_workspace_repository_links_l link
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = link.workspace_id
               LEFT JOIN prism_project_repository_links_l prl
                         ON prl.workspace_repository_link_id = link.link_id
        WHERE link.github_installation_id = $1
          AND link.github_repository_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        ORDER BY link.connected_at DESC
        LIMIT 1
      `,
      [params.githubInstallationId, params.githubRepositoryId],
    );

    return links[0] ?? null;
  }

  async upsertGithubRepositoryLink(
    params: {
      projectId: string;
      workspaceRepositoryLinkId: string;
      connectedByUserId: string;
    },
    manager?: EntityManager,
  ): Promise<ProjectGithubRepositoryLinkRow | null> {
    const links = await this.getManager(manager).query<
      ProjectGithubRepositoryLinkRow[]
    >(
      `
        WITH selected_project AS (
          SELECT p.project_id, p.workspace_id
          FROM prism_projects_l p
                 INNER JOIN prism_workspaces_l w
                            ON w.workspace_id = p.workspace_id
          WHERE p.project_id = $1
            AND w.deleted_at IS NULL
            AND w.status = 'active'
            AND p.status <> 'archived'
          LIMIT 1
        ),
        selected_link AS (
          SELECT link.*
          FROM prism_workspace_repository_links_l link
                 INNER JOIN selected_project p
                            ON p.workspace_id = link.workspace_id
          WHERE link.link_id = $2
          LIMIT 1
        ),
        upserted AS (
          INSERT INTO prism_project_repository_links_l (
            project_id,
            workspace_id,
            workspace_repository_link_id,
            connected_by
          )
          SELECT
            selected_project.project_id,
            selected_project.workspace_id,
            selected_link.link_id,
            $3
          FROM selected_project, selected_link
          ON CONFLICT (project_id)
            DO UPDATE SET
              workspace_id = EXCLUDED.workspace_id,
              workspace_repository_link_id = EXCLUDED.workspace_repository_link_id,
              connected_by = EXCLUDED.connected_by,
              updated_at = NOW()
          RETURNING *
        )
        SELECT
          upserted.project_id AS "projectId",
          upserted.workspace_id AS "workspaceId",
          link.link_id AS "workspaceRepositoryLinkId",
          link.github_installation_id::text AS "githubInstallationId",
          link.github_repository_id::text AS "githubRepositoryId",
          link.repository_owner AS "repositoryOwner",
          link.repository_name AS "repositoryName",
          link.repository_full_name AS "repositoryFullName",
          link.repository_url AS "repositoryUrl",
          link.default_branch AS "defaultBranch",
          link.visibility,
          upserted.connected_by AS "connectedByUserId",
          upserted.connected_at AS "connectedAt"
        FROM upserted
               INNER JOIN prism_workspace_repository_links_l link
                          ON link.link_id = upserted.workspace_repository_link_id
      `,
      [
        params.projectId,
        params.workspaceRepositoryLinkId,
        params.connectedByUserId,
      ],
    );

    return links[0] ?? null;
  }

  async deleteGithubRepositoryLink(
    projectId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const deletedLinks = await this.getManager(manager).query<
      Array<{ projectId: string }>
    >(
      `
        DELETE FROM prism_project_repository_links_l
        WHERE project_id = $1
        RETURNING project_id AS "projectId"
      `,
      [projectId],
    );

    return deletedLinks.length > 0;
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
          p.created_at AS "createdAt"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND wm.role IN ('owner', 'admin')
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
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
          created_by
        )
        SELECT
          w.workspace_id,
          $3,
          $4,
          $5,
          $2
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.slug = $1
          AND wm.user_id = $2
          AND wm.role IN ('owner', 'admin')
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        RETURNING
          project_id AS "projectId",
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
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
    },
    manager?: EntityManager,
  ): Promise<ProjectRow> {
    const projects = await this.getManager(manager).query<ProjectRow[]>(
      `
        UPDATE prism_projects_l
        SET name = $2,
            description = $3,
            updated_at = NOW()
        WHERE project_id = $1
          AND status <> 'archived'
        RETURNING
          project_id AS "projectId",
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          created_at AS "createdAt"
      `,
      [params.projectId, params.name, params.description],
    );

    return projects[0];
  }

  async deleteProjectByIdAndAdminUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const archivedProjects = await this.getManager(manager).query<
      Array<{ projectId: string }>
    >(
      `
        UPDATE prism_projects_l p
        SET status = 'archived',
            archived_at = NOW(),
            updated_at = NOW()
        FROM prism_workspaces_l w,
             prism_workspace_members_l wm
        WHERE p.project_id = $1
          AND w.workspace_id = p.workspace_id
          AND wm.workspace_id = p.workspace_id
          AND wm.user_id = $2
          AND wm.role IN ('owner', 'admin')
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        RETURNING p.project_id AS "projectId"
      `,
      [projectId, userId],
    );

    return archivedProjects.length > 0;
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

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
