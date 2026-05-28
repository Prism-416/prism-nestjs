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

export class AddCommentMentionsAndNotifications1780100000000 implements MigrationInterface {
  name = 'AddCommentMentionsAndNotifications1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_work_item_comment_mentions_l
      (
        comment_id         UUID        NOT NULL REFERENCES prism_work_item_comments_l (comment_id) ON DELETE CASCADE,
        workspace_id       UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        mentioned_user_id  UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
        mentioned_username VARCHAR(30) NOT NULL,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY (comment_id, mentioned_user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_mentions_user
        ON prism_work_item_comment_mentions_l (mentioned_user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_mentions_workspace
        ON prism_work_item_comment_mentions_l (workspace_id, mentioned_user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_notifications_l
      (
        notification_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_user_id UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
        actor_user_id     UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        workspace_id      UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        project_id        UUID,
        notification_type VARCHAR(50) NOT NULL,
        title             TEXT        NOT NULL,
        body              TEXT        NOT NULL,
        target_type       VARCHAR(50) NOT NULL,
        target_id         UUID        NOT NULL,
        metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,
        read_at           TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_notifications_project
          FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
        CONSTRAINT ck_notifications_type
          CHECK (notification_type IN ('work_item_comment_mention')),
        CONSTRAINT ck_notifications_target_type
          CHECK (target_type IN ('work_item_comment')),
        CONSTRAINT uq_notifications_recipient_type_target
          UNIQUE (recipient_user_id, notification_type, target_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
        ON prism_notifications_l (recipient_user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
        ON prism_notifications_l (recipient_user_id, created_at DESC)
        WHERE read_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_notifications_l
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_work_item_comment_mentions_l
    `);
  }
}
