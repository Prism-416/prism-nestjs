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

export class AddAgentRunWorkItemSnapshot1781800000000 implements MigrationInterface {
  name = 'AddAgentRunWorkItemSnapshot1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    // Readable identity of the linked work item, captured at run creation so
    // the agent overview can show a stable label even after the work item is
    // renamed or deleted (the work_item_id FK is nulled on hard delete).
    await queryRunner.query(`
      ALTER TABLE prism_agent_runs_l
        ADD COLUMN IF NOT EXISTS work_item_code_snapshot VARCHAR(20),
        ADD COLUMN IF NOT EXISTS work_item_title_snapshot VARCHAR(100),
        ADD COLUMN IF NOT EXISTS work_item_project_id UUID
    `);

    // Backfill existing runs that still resolve to a live (or soft-deleted)
    // work item. The code mirrors WorkItemRepository.workItemCodeColumn: the
    // sequence is zero-padded to the width of the workspace's largest live
    // sequence number, floored at 3 digits.
    await queryRunner.query(`
      UPDATE prism_agent_runs_l r
      SET
        work_item_title_snapshot = COALESCE(r.work_item_title_snapshot, wi.title),
        work_item_project_id = COALESCE(r.work_item_project_id, wi.project_id),
        work_item_code_snapshot = COALESCE(
          r.work_item_code_snapshot,
          ws.item_code_prefix || '-' || LPAD(
            wi.item_seq::text,
            GREATEST(3, LENGTH((
              SELECT MAX(live.item_seq)
              FROM prism_work_items_l live
              WHERE live.workspace_id = wi.workspace_id
                AND live.deleted_at IS NULL
            )::text)),
            '0'
          )
        )
      FROM prism_work_items_l wi
             INNER JOIN prism_workspaces_l ws
                        ON ws.workspace_id = wi.workspace_id
      WHERE r.work_item_id = wi.item_id
        AND r.workspace_id = wi.workspace_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_agent_runs_l
        DROP COLUMN IF EXISTS work_item_project_id,
        DROP COLUMN IF EXISTS work_item_title_snapshot,
        DROP COLUMN IF EXISTS work_item_code_snapshot
    `);
  }
}
