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

export class AddUserLastActiveAt1781400000000 implements MigrationInterface {
  name = 'AddUserLastActiveAt1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_users_l
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ
    `);

    // Speeds up the DAU/WAU/MAU range filters on the admin user activity
    // summary.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_last_active_at
        ON prism_users_l (last_active_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_last_active_at
    `);

    await queryRunner.query(`
      ALTER TABLE prism_users_l
        DROP COLUMN IF EXISTS last_active_at
    `);
  }
}
