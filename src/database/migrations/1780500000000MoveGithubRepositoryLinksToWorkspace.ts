import { MigrationInterface, QueryRunner } from 'typeorm';

async function applyConfiguredSchema(queryRunner: QueryRunner): Promise<void> {
  const options = queryRunner.connection.options as { schema?: string };
  const schema = options.schema?.trim();

  if (schema) {
    await queryRunner.query(
      `SET search_path TO "${schema.replace(/"/g, '""')}"`,
    );
  }
}

export class MoveGithubRepositoryLinksToWorkspace1780500000000 implements MigrationInterface {
  name = 'MoveGithubRepositoryLinksToWorkspace1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_github_installation_workspace_grants_l
      (
        github_installation_id BIGINT      NOT NULL REFERENCES prism_github_installations_l (github_installation_id) ON DELETE CASCADE,
        workspace_id           UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        granted_by             UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        granted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY (github_installation_id, workspace_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installation_workspace_grants_workspace
        ON prism_github_installation_workspace_grants_l (workspace_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_workspace_repository_links_l
      (
        link_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id           UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        github_installation_id BIGINT      NOT NULL REFERENCES prism_github_installations_l (github_installation_id) ON DELETE CASCADE,
        github_repository_id   BIGINT      NOT NULL,
        repository_owner       TEXT        NOT NULL,
        repository_name        TEXT        NOT NULL,
        repository_full_name   TEXT        NOT NULL,
        repository_url         TEXT        NOT NULL,
        default_branch         TEXT,
        visibility             VARCHAR(20),
        connected_by           UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        connected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_workspace_repository_links_workspace_repo
          UNIQUE (workspace_id, github_repository_id),
        CONSTRAINT ck_workspace_repository_links_visibility
          CHECK (visibility IS NULL OR visibility IN ('public', 'private', 'internal'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO prism_workspace_repository_links_l (
        workspace_id,
        github_installation_id,
        github_repository_id,
        repository_owner,
        repository_name,
        repository_full_name,
        repository_url,
        default_branch,
        visibility,
        connected_by,
        connected_at,
        updated_at
      )
      SELECT DISTINCT ON (workspace_id, github_repository_id)
        workspace_id,
        github_installation_id,
        github_repository_id,
        repository_owner,
        repository_name,
        repository_full_name,
        repository_url,
        default_branch,
        visibility,
        connected_by,
        connected_at,
        updated_at
      FROM prism_project_repository_links_l
      ORDER BY workspace_id, github_repository_id, connected_at DESC
      ON CONFLICT (workspace_id, github_repository_id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO prism_github_installation_workspace_grants_l (
        github_installation_id,
        workspace_id,
        granted_by,
        granted_at
      )
      SELECT DISTINCT ON (github_installation_id, workspace_id)
        github_installation_id,
        workspace_id,
        connected_by,
        connected_at
      FROM prism_project_repository_links_l
      ORDER BY github_installation_id, workspace_id, connected_at DESC
      ON CONFLICT (github_installation_id, workspace_id) DO NOTHING
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_project_repository_links_l
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_repository_links_workspace
        ON prism_workspace_repository_links_l (workspace_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_repository_links_github_repo
        ON prism_workspace_repository_links_l (github_repository_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_project_repository_links_l
      (
        link_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id           UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        project_id             UUID        NOT NULL,
        github_installation_id BIGINT      NOT NULL REFERENCES prism_github_installations_l (github_installation_id) ON DELETE CASCADE,
        github_repository_id   BIGINT      NOT NULL,
        repository_owner       TEXT        NOT NULL,
        repository_name        TEXT        NOT NULL,
        repository_full_name   TEXT        NOT NULL,
        repository_url         TEXT        NOT NULL,
        default_branch         TEXT,
        visibility             VARCHAR(20),
        connected_by           UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        connected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_project_repository_links_project
          FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
        CONSTRAINT uq_project_repository_links_project_repo
          UNIQUE (project_id, github_repository_id),
        CONSTRAINT ck_project_repository_links_visibility
          CHECK (visibility IS NULL OR visibility IN ('public', 'private', 'internal'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_repository_links_project
        ON prism_project_repository_links_l (workspace_id, project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_repository_links_github_repo
        ON prism_project_repository_links_l (github_repository_id)
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_workspace_repository_links_l
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_github_installation_workspace_grants_l
    `);
  }
}
