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

export class AddDocumentSourceMetadata1780700000000 implements MigrationInterface {
  name = 'AddDocumentSourceMetadata1780700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD COLUMN IF NOT EXISTS source_kind VARCHAR(20) NOT NULL DEFAULT 'direct',
        ADD COLUMN IF NOT EXISTS source_work_item_title_snapshot VARCHAR(100)
    `);

    await queryRunner.query(`
      UPDATE prism_documents_l d
      SET
        source_kind = 'work_item',
        source_work_item_title_snapshot = COALESCE(
          d.source_work_item_title_snapshot,
          wi.title
        )
      FROM prism_work_items_l wi
      WHERE d.source_work_item_id = wi.item_id
    `);

    await queryRunner.query(`
      UPDATE prism_documents_l
      SET source_kind = 'work_item'
      WHERE source_comment_id IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_comment_requires_work_item,
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind,
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind_direct
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT ck_documents_source_kind
          CHECK (source_kind IN ('direct', 'work_item')),
        ADD CONSTRAINT ck_documents_source_comment_requires_work_item
          CHECK (
            source_comment_id IS NULL
            OR source_kind = 'work_item'
          ),
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind_direct,
        DROP CONSTRAINT IF EXISTS ck_documents_source_kind,
        DROP CONSTRAINT IF EXISTS ck_documents_source_comment_requires_work_item
    `);

    await queryRunner.query(`
      UPDATE prism_documents_l
      SET source_comment_id = NULL
      WHERE source_work_item_id IS NULL
        AND source_comment_id IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT ck_documents_source_comment_requires_work_item
          CHECK (
            source_comment_id IS NULL
            OR source_work_item_id IS NOT NULL
          )
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP COLUMN IF EXISTS source_work_item_title_snapshot,
        DROP COLUMN IF EXISTS source_kind
    `);
  }
}
