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

export class AddWorkItemSoftDelete1780300000000 implements MigrationInterface {
  name = 'AddWorkItemSoftDelete1780300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `);

    // Speeds up the "hide trashed" filter on board/list queries and the trash
    // listing / retention purge.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_work_items_project_deleted
        ON prism_work_items_l (project_id, deleted_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_work_items_project_deleted
    `);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        DROP COLUMN IF EXISTS deleted_at
    `);
  }
}
