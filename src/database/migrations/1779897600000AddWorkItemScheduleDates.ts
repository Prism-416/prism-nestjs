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

export class AddWorkItemScheduleDates1779897600000 implements MigrationInterface {
  name = 'AddWorkItemScheduleDates1779897600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS due_date DATE
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_work_items_schedule_dates'
            AND conrelid = 'prism_work_items_l'::regclass
        ) THEN
          ALTER TABLE prism_work_items_l
            ADD CONSTRAINT ck_work_items_schedule_dates
              CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        DROP CONSTRAINT IF EXISTS ck_work_items_schedule_dates,
        DROP COLUMN IF EXISTS due_date,
        DROP COLUMN IF EXISTS start_date
    `);
  }
}
