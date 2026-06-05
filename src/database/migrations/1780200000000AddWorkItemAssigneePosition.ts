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

export class AddWorkItemAssigneePosition1780200000000 implements MigrationInterface {
  name = 'AddWorkItemAssigneePosition1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_item_member_map
        ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0
    `);

    // Backfill existing rows with a deterministic order (alphabetical by
    // username) so current items keep their existing appearance.
    await queryRunner.query(`
      WITH ordered AS (
        SELECT
          m.item_id,
          m.user_id,
          ROW_NUMBER() OVER (
            PARTITION BY m.item_id
            ORDER BY u.username
          ) AS rn
        FROM prism_work_item_member_map m
               INNER JOIN prism_users_l u
                          ON u.user_id = m.user_id
      )
      UPDATE prism_work_item_member_map m
      SET position = ordered.rn
      FROM ordered
      WHERE m.item_id = ordered.item_id
        AND m.user_id = ordered.user_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_work_item_member_map
        DROP COLUMN IF EXISTS position
    `);
  }
}
