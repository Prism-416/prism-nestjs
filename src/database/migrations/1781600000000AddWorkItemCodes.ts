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

export class AddWorkItemCodes1781600000000 implements MigrationInterface {
  name = 'AddWorkItemCodes1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    // Workspace-level prefix + monotonic counter that backs work item codes.
    await queryRunner.query(`
      ALTER TABLE prism_workspaces_l
        ADD COLUMN IF NOT EXISTS item_code_prefix VARCHAR(4) NOT NULL DEFAULT 'TASK',
        ADD COLUMN IF NOT EXISTS item_seq_counter INTEGER NOT NULL DEFAULT 0
    `);

    // Derive a prefix from the workspace name (letters only, uppercased, first
    // 4). Rows whose name yields fewer than 3 letters keep the 'TASK' default so
    // the check constraint below is always satisfied.
    await queryRunner.query(`
      UPDATE prism_workspaces_l
      SET item_code_prefix = LEFT(UPPER(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g')), 4)
      WHERE LENGTH(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g')) >= 3
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_workspaces_item_code_prefix'
            AND conrelid = 'prism_workspaces_l'::regclass
        ) THEN
          ALTER TABLE prism_workspaces_l
            ADD CONSTRAINT ck_workspaces_item_code_prefix
              CHECK (item_code_prefix ~ '^[A-Z]{3,4}$');
        END IF;
      END
      $$
    `);

    // Per-work-item sequence number (workspace-scoped, immutable once assigned).
    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        ADD COLUMN IF NOT EXISTS item_seq INTEGER
    `);

    // Backfill sequence numbers over ALL rows (including soft-deleted) so the
    // numbers stay unique and stable, ordered by creation.
    await queryRunner.query(`
      UPDATE prism_work_items_l wi
      SET item_seq = numbered.seq
      FROM (
        SELECT
          item_id,
          ROW_NUMBER() OVER (
            PARTITION BY workspace_id
            ORDER BY created_at, item_id
          ) AS seq
        FROM prism_work_items_l
      ) numbered
      WHERE wi.item_id = numbered.item_id
        AND wi.item_seq IS NULL
    `);

    // Seed each workspace counter from the highest assigned sequence number.
    await queryRunner.query(`
      UPDATE prism_workspaces_l w
      SET item_seq_counter = COALESCE(m.max_seq, 0)
      FROM (
        SELECT workspace_id, MAX(item_seq) AS max_seq
        FROM prism_work_items_l
        GROUP BY workspace_id
      ) m
      WHERE w.workspace_id = m.workspace_id
    `);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        ALTER COLUMN item_seq SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_work_items_workspace_seq'
            AND conrelid = 'prism_work_items_l'::regclass
        ) THEN
          ALTER TABLE prism_work_items_l
            ADD CONSTRAINT uq_work_items_workspace_seq UNIQUE (workspace_id, item_seq);
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_items_l
        DROP CONSTRAINT IF EXISTS uq_work_items_workspace_seq,
        DROP COLUMN IF EXISTS item_seq
    `);

    await queryRunner.query(`
      ALTER TABLE prism_workspaces_l
        DROP CONSTRAINT IF EXISTS ck_workspaces_item_code_prefix,
        DROP COLUMN IF EXISTS item_seq_counter,
        DROP COLUMN IF EXISTS item_code_prefix
    `);
  }
}
