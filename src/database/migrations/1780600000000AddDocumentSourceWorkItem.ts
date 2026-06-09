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

export class AddDocumentSourceWorkItem1780600000000 implements MigrationInterface {
  name = 'AddDocumentSourceWorkItem1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    // Documents shared from a work item conversation carry the originating
    // work item so the Documents view can group them by source. A direct
    // upload leaves this NULL.
    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD COLUMN IF NOT EXISTS source_work_item_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS fk_documents_source_work_item
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT fk_documents_source_work_item
          FOREIGN KEY (source_work_item_id)
            REFERENCES prism_work_items_l (item_id)
            ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source_work_item
        ON prism_documents_l (source_work_item_id)
    `);

    // A document can also be tied to the specific comment it was shared in, so
    // the work item conversation can render attachments under that comment.
    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD COLUMN IF NOT EXISTS source_comment_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS fk_documents_source_comment
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT fk_documents_source_comment
          FOREIGN KEY (source_comment_id)
            REFERENCES prism_work_item_comments_l (comment_id)
            ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source_comment
        ON prism_documents_l (source_comment_id)
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_comment_requires_work_item
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        ADD CONSTRAINT ck_documents_source_comment_requires_work_item
          CHECK (
            source_comment_id IS NULL
            OR source_work_item_id IS NOT NULL
          )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS ck_documents_source_comment_requires_work_item
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_source_comment
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS fk_documents_source_comment
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP COLUMN IF EXISTS source_comment_id
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_source_work_item
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP CONSTRAINT IF EXISTS fk_documents_source_work_item
    `);

    await queryRunner.query(`
      ALTER TABLE prism_documents_l
        DROP COLUMN IF EXISTS source_work_item_id
    `);
  }
}
