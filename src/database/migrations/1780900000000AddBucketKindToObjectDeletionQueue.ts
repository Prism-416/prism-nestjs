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

export class AddBucketKindToObjectDeletionQueue1780900000000 implements MigrationInterface {
  name = 'AddBucketKindToObjectDeletionQueue1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_object_deletion_queue_l
        ADD COLUMN IF NOT EXISTS bucket_kind VARCHAR(32)
    `);

    // Every queued deletion so far originates from the documents bucket.
    await queryRunner.query(`
      UPDATE prism_object_deletion_queue_l
      SET bucket_kind = 'documents'
      WHERE bucket_kind IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE prism_object_deletion_queue_l
        ALTER COLUMN bucket_kind SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_object_deletion_queue_l
        DROP COLUMN IF EXISTS bucket_kind
    `);
  }
}
