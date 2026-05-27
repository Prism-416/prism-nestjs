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

export class AddFeatureProvisioningRequests1780000000000 implements MigrationInterface {
  name = 'AddFeatureProvisioningRequests1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_feature_provisioning_requests_l
      (
        request_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id       UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
        project_id         UUID         NOT NULL,
        requested_by       UUID         REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
        status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
        payload_object_name TEXT        NOT NULL,
        payload_version_id  TEXT,
        queue_message_id    TEXT,
        error_message       TEXT,
        dispatched_at       TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_feature_provisioning_project
          FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
        CONSTRAINT ck_feature_provisioning_status
          CHECK (status IN ('pending', 'queued', 'dispatch_failed'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_provisioning_workspace_status
        ON prism_feature_provisioning_requests_l (workspace_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_provisioning_project
        ON prism_feature_provisioning_requests_l (workspace_id, project_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_feature_provisioning_requests_l
    `);
  }
}
