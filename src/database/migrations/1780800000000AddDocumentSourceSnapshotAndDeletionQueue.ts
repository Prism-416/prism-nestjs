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

export class AddDocumentSourceSnapshotAndDeletionQueue1780800000000 implements MigrationInterface {
  name = 'AddDocumentSourceSnapshotAndDeletionQueue1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD COLUMN IF NOT EXISTS source_work_item_id_snapshot UUID
    `);

    await queryRunner.query(`
      UPDATE prism_documents_l
      SET source_work_item_id_snapshot = source_work_item_id
      WHERE source_kind = 'work_item'
        AND source_work_item_id_snapshot IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source_work_item_snapshot
        ON prism_documents_l (source_work_item_id_snapshot)
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind_direct
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT ck_documents_source_kind_direct
          CHECK (
            source_kind <> 'direct'
            OR (
              source_work_item_id IS NULL
              AND source_work_item_id_snapshot IS NULL
              AND source_comment_id IS NULL
              AND source_work_item_title_snapshot IS NULL
            )
          )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_object_deletion_queue_l (
        deletion_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_kind         VARCHAR(32)  NOT NULL,
        object_name         TEXT         NOT NULL,
        storage_version_id  VARCHAR(255),
        reason              VARCHAR(255) NOT NULL,
        attempts            INTEGER      NOT NULL DEFAULT 0,
        next_attempt_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        last_error          VARCHAR(2000),
        created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        completed_at        TIMESTAMPTZ,

        CONSTRAINT ck_object_deletion_queue_attempts_nonnegative
          CHECK (attempts >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_object_deletion_queue_pending
        ON prism_object_deletion_queue_l (next_attempt_at, created_at)
        WHERE completed_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_object_deletion_queue_l
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind_direct
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT ck_documents_source_kind_direct
          CHECK (
            source_kind <> 'direct'
            OR (
              source_work_item_id IS NULL
              AND source_comment_id IS NULL
              AND source_work_item_title_snapshot IS NULL
            )
          )
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_source_work_item_snapshot
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP COLUMN IF EXISTS source_work_item_id_snapshot
    `);
  }
}
