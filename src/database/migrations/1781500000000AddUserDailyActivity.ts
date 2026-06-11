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

export class AddUserDailyActivity1781500000000 implements MigrationInterface {
  name = 'AddUserDailyActivity1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    // Append-only, one row per user per active day. Backs the daily active-user
    // trend (distinct DAU/day) and the new-vs-returning split. Populated going
    // forward by the request interceptor; history cannot be backfilled.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_user_daily_activity_l
      (
        user_id       UUID NOT NULL,
        activity_date DATE NOT NULL,
        PRIMARY KEY (user_id, activity_date)
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_user_daily_activity_user'
            AND conrelid = 'prism_user_daily_activity_l'::regclass
        ) THEN
          ALTER TABLE prism_user_daily_activity_l
            ADD CONSTRAINT fk_user_daily_activity_user
              FOREIGN KEY (user_id)
                REFERENCES prism_users_l (user_id)
                ON DELETE CASCADE;
        END IF;
      END
      $$
    `);

    // Speeds up the per-day GROUP BY in the active-user trend.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_daily_activity_date
        ON prism_user_daily_activity_l (activity_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_user_daily_activity_l
    `);
  }
}
