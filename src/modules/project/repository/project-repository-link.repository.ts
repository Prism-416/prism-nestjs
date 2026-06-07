import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { GithubRepositorySummary } from '@/modules/github/types';
import type { ProjectRepositoryLinkRow } from '@/modules/project/types';

@Injectable()
export class ProjectRepositoryLinkRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findLinksByProjectId(
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectRepositoryLinkRow[]> {
    return this.getManager(manager).query<ProjectRepositoryLinkRow[]>(
      `
        SELECT
          link_id AS "linkId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          github_installation_id::text AS "githubInstallationId",
          github_repository_id::text AS "githubRepositoryId",
          repository_owner AS "repositoryOwner",
          repository_name AS "repositoryName",
          repository_full_name AS "repositoryFullName",
          repository_url AS "repositoryUrl",
          default_branch AS "defaultBranch",
          visibility,
          connected_by AS "connectedByUserId",
          connected_at AS "connectedAt"
        FROM prism_project_repository_links_l
        WHERE project_id = $1
        ORDER BY connected_at DESC
      `,
      [projectId],
    );
  }

  async upsertLink(
    params: {
      workspaceId: string;
      projectId: string;
      githubInstallationId: string;
      connectedByUserId: string;
      repository: GithubRepositorySummary;
    },
    manager?: EntityManager,
  ): Promise<ProjectRepositoryLinkRow> {
    const links = await this.getManager(manager).query<
      ProjectRepositoryLinkRow[]
    >(
      `
        INSERT INTO prism_project_repository_links_l (
          workspace_id,
          project_id,
          github_installation_id,
          github_repository_id,
          repository_owner,
          repository_name,
          repository_full_name,
          repository_url,
          default_branch,
          visibility,
          connected_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (project_id, github_repository_id)
          DO UPDATE SET
            github_installation_id = EXCLUDED.github_installation_id,
            repository_owner = EXCLUDED.repository_owner,
            repository_name = EXCLUDED.repository_name,
            repository_full_name = EXCLUDED.repository_full_name,
            repository_url = EXCLUDED.repository_url,
            default_branch = EXCLUDED.default_branch,
            visibility = EXCLUDED.visibility,
            connected_by = EXCLUDED.connected_by,
            updated_at = NOW()
        RETURNING
          link_id AS "linkId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          github_installation_id::text AS "githubInstallationId",
          github_repository_id::text AS "githubRepositoryId",
          repository_owner AS "repositoryOwner",
          repository_name AS "repositoryName",
          repository_full_name AS "repositoryFullName",
          repository_url AS "repositoryUrl",
          default_branch AS "defaultBranch",
          visibility,
          connected_by AS "connectedByUserId",
          connected_at AS "connectedAt"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.githubInstallationId,
        params.repository.githubRepositoryId,
        params.repository.owner,
        params.repository.name,
        params.repository.fullName,
        params.repository.htmlUrl,
        params.repository.defaultBranch,
        params.repository.visibility,
        params.connectedByUserId,
      ],
    );

    return links[0];
  }

  async deleteLink(
    params: {
      projectId: string;
      linkId: string;
    },
    manager?: EntityManager,
  ): Promise<boolean> {
    const deletedLinks = await this.getManager(manager).query<
      Array<{ linkId: string }>
    >(
      `
        DELETE FROM prism_project_repository_links_l
        WHERE project_id = $1
          AND link_id = $2
        RETURNING link_id AS "linkId"
      `,
      [params.projectId, params.linkId],
    );

    return deletedLinks.length > 0;
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
