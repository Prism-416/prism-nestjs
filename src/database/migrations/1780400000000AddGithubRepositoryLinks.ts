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
        github_installation_id BIGINT
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'github_installation_id'
            AND udt_name = 'uuid'
        ) AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'external_installation_id'
        ) THEN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'prism_github_installations_l'
              AND column_name = 'legacy_github_installation_uuid'
          ) THEN
            ALTER TABLE prism_github_installations_l
              RENAME COLUMN github_installation_id TO legacy_github_installation_uuid;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'prism_github_installations_l'
              AND column_name = 'github_installation_id'
          ) THEN
            ALTER TABLE prism_github_installations_l
              RENAME COLUMN external_installation_id TO github_installation_id;
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'github_account_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'account_id'
        ) THEN
          ALTER TABLE prism_github_installations_l
            RENAME COLUMN github_account_id TO account_id;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'github_account_login'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'account_login'
        ) THEN
          ALTER TABLE prism_github_installations_l
            RENAME COLUMN github_account_login TO account_login;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'github_account_type'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'account_type'
        ) THEN
          ALTER TABLE prism_github_installations_l
            RENAME COLUMN github_account_type TO account_type;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'installed_by_user_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'installed_by'
        ) THEN
          ALTER TABLE prism_github_installations_l
            RENAME COLUMN installed_by_user_id TO installed_by;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'prism_github_installations_l'
            AND column_name = 'workspace_id'
        ) THEN
          ALTER TABLE prism_github_installations_l
            ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      ALTER TABLE prism_github_installations_l
        ADD COLUMN IF NOT EXISTS account_id BIGINT NOT NULL,
        ADD COLUMN IF NOT EXISTS account_login TEXT NOT NULL,
        ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL,
        ADD COLUMN IF NOT EXISTS repository_selection VARCHAR(20) NOT NULL,
        ADD COLUMN IF NOT EXISTS installed_by UUID,
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS html_url TEXT,
        ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ALTER COLUMN github_installation_id SET NOT NULL,
        ALTER COLUMN account_id SET NOT NULL,
        ALTER COLUMN account_login SET NOT NULL,
        ALTER COLUMN account_type SET NOT NULL,
        ALTER COLUMN repository_selection SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'active',
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN installed_at DROP NOT NULL,
        ALTER COLUMN created_at SET DEFAULT NOW(),
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'prism_github_installations_l'::regclass
            AND contype = 'p'
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT pk_github_installations PRIMARY KEY (github_installation_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
                 INNER JOIN pg_attribute a
                            ON a.attrelid = c.conrelid
                              AND a.attnum = ANY(c.conkey)
          WHERE c.conrelid = 'prism_github_installations_l'::regclass
            AND c.contype IN ('p', 'u')
            AND a.attname = 'github_installation_id'
            AND array_length(c.conkey, 1) = 1
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT uq_github_installations_github_installation_id
              UNIQUE (github_installation_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installations_installed_by'
            AND conrelid = 'prism_github_installations_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT fk_github_installations_installed_by
              FOREIGN KEY (installed_by)
                REFERENCES prism_users_l (user_id)
                ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_github_installations_account_type'
            AND conrelid = 'prism_github_installations_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT ck_github_installations_account_type
              CHECK (account_type IN ('User', 'Organization'));
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_github_installations_repository_selection'
            AND conrelid = 'prism_github_installations_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT ck_github_installations_repository_selection
              CHECK (repository_selection IN ('all', 'selected'));
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_github_installations_status'
            AND conrelid = 'prism_github_installations_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installations_l
            ADD CONSTRAINT ck_github_installations_status
              CHECK (status IN ('active', 'suspended', 'deleted'));
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installations_account
        ON prism_github_installations_l (account_login)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_github_installation_user_grants_l
      (
        github_installation_id BIGINT,
        user_id                UUID
      )
    `);

    await queryRunner.query(`
      ALTER TABLE prism_github_installation_user_grants_l
        ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ALTER COLUMN github_installation_id SET NOT NULL,
        ALTER COLUMN user_id SET NOT NULL,
        ALTER COLUMN granted_at SET DEFAULT NOW(),
        ALTER COLUMN granted_at SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'prism_github_installation_user_grants_l'::regclass
            AND contype = 'p'
        ) THEN
          ALTER TABLE prism_github_installation_user_grants_l
            ADD CONSTRAINT pk_github_installation_user_grants
              PRIMARY KEY (github_installation_id, user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installation_user_grants_installation'
            AND conrelid = 'prism_github_installation_user_grants_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installation_user_grants_l
            ADD CONSTRAINT fk_github_installation_user_grants_installation
              FOREIGN KEY (github_installation_id)
                REFERENCES prism_github_installations_l (github_installation_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_github_installation_user_grants_user'
            AND conrelid = 'prism_github_installation_user_grants_l'::regclass
        ) THEN
          ALTER TABLE prism_github_installation_user_grants_l
            ADD CONSTRAINT fk_github_installation_user_grants_user
              FOREIGN KEY (user_id)
                REFERENCES prism_users_l (user_id)
                ON DELETE CASCADE;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_github_installation_user_grants_user
        ON prism_github_installation_user_grants_l (user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_project_repository_links_l
      (
        link_id UUID
      )
    `);

    await queryRunner.query(`
      ALTER TABLE prism_project_repository_links_l
        ADD COLUMN IF NOT EXISTS workspace_id UUID NOT NULL,
        ADD COLUMN IF NOT EXISTS project_id UUID NOT NULL,
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
        ALTER COLUMN project_id SET NOT NULL,
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
          WHERE conrelid = 'prism_project_repository_links_l'::regclass
            AND contype = 'p'
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT pk_project_repository_links PRIMARY KEY (link_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_project_repository_links_workspace'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_workspace
              FOREIGN KEY (workspace_id)
                REFERENCES prism_workspaces_l (workspace_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_project_repository_links_installation'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_installation
              FOREIGN KEY (github_installation_id)
                REFERENCES prism_github_installations_l (github_installation_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_project_repository_links_connected_by'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_connected_by
              FOREIGN KEY (connected_by)
                REFERENCES prism_users_l (user_id)
                ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_project_repository_links_project'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_project
              FOREIGN KEY (workspace_id, project_id)
                REFERENCES prism_projects_l (workspace_id, project_id)
                ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_project_repository_links_project_repo'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT uq_project_repository_links_project_repo
              UNIQUE (project_id, github_repository_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_project_repository_links_visibility'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT ck_project_repository_links_visibility
              CHECK (visibility IS NULL OR visibility IN ('public', 'private', 'internal'));
        END IF;
      END
      $$
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
