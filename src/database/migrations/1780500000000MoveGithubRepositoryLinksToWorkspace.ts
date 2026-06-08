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
        github_installation_id BIGINT,
        workspace_id           UUID
      )
    `);

    await queryRunner.query(`
      ALTER TABLE prism_github_installation_workspace_grants_l
        ADD COLUMN IF NOT EXISTS granted_by UUID,
        ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ALTER COLUMN github_installation_id SET NOT NULL,
        ALTER COLUMN workspace_id SET NOT NULL,
        ALTER COLUMN granted_at SET DEFAULT NOW(),
        ALTER COLUMN granted_at SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'prism_github_installation_workspace_grants_l'::regclass
            AND contype = 'p'
        ) THEN
          ALTER TABLE prism_github_installation_workspace_grants_l
            ADD CONSTRAINT pk_github_installation_workspace_grants
              PRIMARY KEY (github_installation_id, workspace_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installation_workspace_grants_installation'
            AND conrelid = 'prism_github_installation_workspace_grants_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installation_workspace_grants_l
            ADD CONSTRAINT fk_github_installation_workspace_grants_installation
              FOREIGN KEY (github_installation_id)
                REFERENCES prism_github_installations_l (github_installation_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installation_workspace_grants_workspace'
            AND conrelid = 'prism_github_installation_workspace_grants_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installation_workspace_grants_l
            ADD CONSTRAINT fk_github_installation_workspace_grants_workspace
              FOREIGN KEY (workspace_id)
                REFERENCES prism_workspaces_l (workspace_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installation_workspace_grants_granted_by'
            AND conrelid = 'prism_github_installation_workspace_grants_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installation_workspace_grants_l
            ADD CONSTRAINT fk_github_installation_workspace_grants_granted_by
              FOREIGN KEY (granted_by)
                REFERENCES prism_users_l (user_id)
                ON DELETE SET NULL;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installation_workspace_grants_workspace
        ON prism_github_installation_workspace_grants_l (workspace_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_workspace_repository_links_l
      (
        link_id UUID
      )
    `);

    await queryRunner.query(`
      ALTER TABLE prism_workspace_repository_links_l
        ADD COLUMN IF NOT EXISTS workspace_id UUID NOT NULL,
        ADD COLUMN IF NOT EXISTS github_installation_id BIGINT NOT NULL,
        ADD COLUMN IF NOT EXISTS github_repository_id BIGINT NOT NULL,
        ADD COLUMN IF NOT EXISTS repository_owner TEXT NOT NULL,
        ADD COLUMN IF NOT EXISTS repository_name TEXT NOT NULL,
        ADD COLUMN IF NOT EXISTS repository_full_name TEXT NOT NULL,
        ADD COLUMN IF NOT EXISTS repository_url TEXT NOT NULL,
        ADD COLUMN IF NOT EXISTS default_branch TEXT,
        ADD COLUMN IF NOT EXISTS visibility VARCHAR(20),
        ADD COLUMN IF NOT EXISTS connected_by UUID,
        ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ALTER COLUMN link_id SET DEFAULT gen_random_uuid(),
        ALTER COLUMN link_id SET NOT NULL,
        ALTER COLUMN workspace_id SET NOT NULL,
        ALTER COLUMN github_installation_id SET NOT NULL,
        ALTER COLUMN github_repository_id SET NOT NULL,
        ALTER COLUMN repository_owner SET NOT NULL,
        ALTER COLUMN repository_name SET NOT NULL,
        ALTER COLUMN repository_full_name SET NOT NULL,
        ALTER COLUMN repository_url SET NOT NULL,
        ALTER COLUMN connected_at SET DEFAULT NOW(),
        ALTER COLUMN connected_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'prism_workspace_repository_links_l'::regclass
            AND contype = 'p'
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT pk_workspace_repository_links PRIMARY KEY (link_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_workspace_repository_links_workspace'
            AND conrelid = 'prism_workspace_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT fk_workspace_repository_links_workspace
              FOREIGN KEY (workspace_id)
                REFERENCES prism_workspaces_l (workspace_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_workspace_repository_links_installation'
            AND conrelid = 'prism_workspace_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT fk_workspace_repository_links_installation
              FOREIGN KEY (github_installation_id)
                REFERENCES prism_github_installations_l (github_installation_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_workspace_repository_links_connected_by'
            AND conrelid = 'prism_workspace_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT fk_workspace_repository_links_connected_by
              FOREIGN KEY (connected_by)
                REFERENCES prism_users_l (user_id)
                ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_workspace_repository_links_workspace_repo'
            AND conrelid = 'prism_workspace_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT uq_workspace_repository_links_workspace_repo
              UNIQUE (workspace_id, github_repository_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_workspace_repository_links_visibility'
            AND conrelid = 'prism_workspace_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_workspace_repository_links_l
            ADD CONSTRAINT ck_workspace_repository_links_visibility
              CHECK (visibility IS NULL OR visibility IN ('public', 'private', 'internal'));
        END IF;
      END
      $$
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
