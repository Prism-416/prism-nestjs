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

export class AddGithubRepositoryLinks1780400000000 implements MigrationInterface {
  name = 'AddGithubRepositoryLinks1780400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_github_installations_l
      (
        github_installation_id BIGINT      PRIMARY KEY,
        account_id             BIGINT      NOT NULL,
        account_login          TEXT        NOT NULL,
        account_type           VARCHAR(20) NOT NULL,
        repository_selection   VARCHAR(20) NOT NULL,
        installed_by           UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        status                 VARCHAR(20) NOT NULL DEFAULT 'active',
        html_url               TEXT,
        installed_at           TIMESTAMPTZ,
        suspended_at           TIMESTAMPTZ,
        last_synced_at         TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT ck_github_installations_account_type
          CHECK (account_type IN ('User', 'Organization')),
        CONSTRAINT ck_github_installations_repository_selection
          CHECK (repository_selection IN ('all', 'selected')),
        CONSTRAINT ck_github_installations_status
          CHECK (status IN ('active', 'suspended', 'deleted'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installations_account
        ON prism_github_installations_l (account_login)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_github_installation_user_grants_l
      (
        github_installation_id BIGINT      NOT NULL REFERENCES prism_github_installations_l (github_installation_id) ON DELETE CASCADE,
        user_id                UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
        granted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY (github_installation_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installation_user_grants_user
        ON prism_github_installation_user_grants_l (user_id)
    `);

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_project_repository_links_l
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_github_installation_user_grants_l
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_github_installations_l
    `);
  }
}
