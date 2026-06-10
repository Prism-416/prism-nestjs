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

export class AddProjectRepositoryLinks1781300000000 implements MigrationInterface {
  name = 'AddProjectRepositoryLinks1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_project_repository_links_l
      (
        project_id                   UUID PRIMARY KEY,
        workspace_id                 UUID        NOT NULL,
        workspace_repository_link_id UUID        NOT NULL,
        connected_by                 UUID,
        connected_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_project_repository_links_project'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_project
              FOREIGN KEY (project_id)
                REFERENCES prism_projects_l (project_id)
                ON DELETE CASCADE;
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
          WHERE conname = 'fk_project_repository_links_workspace_repository'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT fk_project_repository_links_workspace_repository
              FOREIGN KEY (workspace_repository_link_id)
                REFERENCES prism_workspace_repository_links_l (link_id)
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
          WHERE conname = 'uq_project_repository_links_workspace_repository'
            AND conrelid = 'prism_project_repository_links_l'::regclass
        ) THEN
          ALTER TABLE prism_project_repository_links_l
            ADD CONSTRAINT uq_project_repository_links_workspace_repository
              UNIQUE (workspace_repository_link_id);
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_repository_links_workspace
        ON prism_project_repository_links_l (workspace_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_project_repository_links_l
    `);
  }
}
