import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { GithubInstallationSummary } from '@/modules/github/types';

@Injectable()
export class GithubInstallationRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async upsertInstallation(
    params: GithubInstallationSummary & {
      installedByUserId: string | null;
    },
    manager?: EntityManager,
  ): Promise<GithubInstallationSummary> {
    const installations = await this.getManager(manager).query<
      GithubInstallationSummary[]
    >(
      `
        INSERT INTO prism_github_installations_l (
          github_installation_id,
          account_id,
          account_login,
          account_type,
          repository_selection,
          installed_by,
          status,
          html_url,
          installed_at,
          suspended_at,
          last_synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (github_installation_id)
          DO UPDATE SET
            account_id = EXCLUDED.account_id,
            account_login = EXCLUDED.account_login,
            account_type = EXCLUDED.account_type,
            repository_selection = EXCLUDED.repository_selection,
            installed_by = COALESCE(prism_github_installations_l.installed_by, EXCLUDED.installed_by),
            status = EXCLUDED.status,
            html_url = EXCLUDED.html_url,
            installed_at = COALESCE(EXCLUDED.installed_at, prism_github_installations_l.installed_at),
            suspended_at = EXCLUDED.suspended_at,
            last_synced_at = NOW(),
            updated_at = NOW()
        RETURNING
          github_installation_id::text AS "githubInstallationId",
          account_id::text AS "accountId",
          account_login AS "accountLogin",
          account_type AS "accountType",
          repository_selection AS "repositorySelection",
          html_url AS "htmlUrl",
          installed_at AS "installedAt",
          suspended_at AS "suspendedAt",
          status
      `,
      [
        params.githubInstallationId,
        params.accountId,
        params.accountLogin,
        params.accountType,
        params.repositorySelection,
        params.installedByUserId,
        params.status,
        params.htmlUrl,
        params.installedAt,
        params.suspendedAt,
      ],
    );

    return installations[0];
  }

  async grantInstallationToUser(
    params: {
      githubInstallationId: string;
      userId: string;
    },
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_github_installation_user_grants_l (
          github_installation_id,
          user_id
        )
        VALUES ($1, $2)
        ON CONFLICT (github_installation_id, user_id)
          DO UPDATE SET granted_at = NOW()
      `,
      [params.githubInstallationId, params.userId],
    );
  }

  async existsInstallationGrant(
    params: {
      githubInstallationId: string;
      userId: string;
    },
    manager?: EntityManager,
  ): Promise<boolean> {
    const grants = await this.getManager(manager).query<Array<{ exists: 1 }>>(
      `
        SELECT 1 AS "exists"
        FROM prism_github_installation_user_grants_l
        WHERE github_installation_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [params.githubInstallationId, params.userId],
    );

    return grants.length > 0;
  }

  async grantInstallationToWorkspace(
    params: {
      githubInstallationId: string;
      workspaceId: string;
      grantedByUserId: string | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_github_installation_workspace_grants_l (
          github_installation_id,
          workspace_id,
          granted_by
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (github_installation_id, workspace_id)
          DO UPDATE SET
            granted_by = EXCLUDED.granted_by,
            granted_at = NOW()
      `,
      [params.githubInstallationId, params.workspaceId, params.grantedByUserId],
    );
  }

  async existsInstallationWorkspaceGrant(
    params: {
      githubInstallationId: string;
      workspaceId: string;
    },
    manager?: EntityManager,
  ): Promise<boolean> {
    const grants = await this.getManager(manager).query<Array<{ exists: 1 }>>(
      `
        SELECT 1 AS "exists"
        FROM prism_github_installation_workspace_grants_l
        WHERE github_installation_id = $1
          AND workspace_id = $2
        LIMIT 1
      `,
      [params.githubInstallationId, params.workspaceId],
    );

    return grants.length > 0;
  }

  async markInstallationDeleted(
    githubInstallationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const target = this.getManager(manager);

    await target.query(
      `
        UPDATE prism_github_installations_l
        SET
          status = 'deleted',
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE github_installation_id = $1
      `,
      [githubInstallationId],
    );

    await target.query(
      `
        DELETE FROM prism_workspace_repository_links_l
        WHERE github_installation_id = $1
      `,
      [githubInstallationId],
    );

    await target.query(
      `
        DELETE FROM prism_github_installation_workspace_grants_l
        WHERE github_installation_id = $1
      `,
      [githubInstallationId],
    );

    await target.query(
      `
        DELETE FROM prism_github_installation_user_grants_l
        WHERE github_installation_id = $1
      `,
      [githubInstallationId],
    );
  }

  async deleteWorkspaceRepositoryLinksByInstallationRepositories(
    params: {
      githubInstallationId: string;
      githubRepositoryIds: string[];
    },
    manager?: EntityManager,
  ): Promise<void> {
    if (params.githubRepositoryIds.length === 0) {
      return;
    }

    await this.getManager(manager).query(
      `
        DELETE FROM prism_workspace_repository_links_l
        WHERE github_installation_id = $1
          AND github_repository_id = ANY($2::bigint[])
      `,
      [params.githubInstallationId, params.githubRepositoryIds],
    );
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
