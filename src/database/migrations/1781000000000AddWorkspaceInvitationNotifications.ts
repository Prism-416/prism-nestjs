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

export class AddWorkspaceInvitationNotifications1781000000000 implements MigrationInterface {
  name = 'AddWorkspaceInvitationNotifications1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      DROP CONSTRAINT IF EXISTS ck_notifications_type
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      ADD CONSTRAINT ck_notifications_type
      CHECK (notification_type IN ('work_item_comment_mention', 'workspace_invitation'))
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      DROP CONSTRAINT IF EXISTS ck_notifications_target_type
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      ADD CONSTRAINT ck_notifications_target_type
      CHECK (target_type IN ('work_item_comment', 'workspace_invitation'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      DROP CONSTRAINT IF EXISTS ck_notifications_type
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      DROP CONSTRAINT IF EXISTS ck_notifications_target_type
    `);

    await queryRunner.query(`
      DELETE FROM prism_notifications_l
      WHERE notification_type = 'workspace_invitation'
         OR target_type = 'workspace_invitation'
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      ADD CONSTRAINT ck_notifications_type
      CHECK (notification_type IN ('work_item_comment_mention'))
    `);

    await queryRunner.query(`
      ALTER TABLE prism_notifications_l
      ADD CONSTRAINT ck_notifications_target_type
      CHECK (target_type IN ('work_item_comment'))
    `);
  }
}
