import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1777852800000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1777852800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_password_reset_tokens_l
      (
          password_reset_token_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
          auth_id                   UUID        NOT NULL REFERENCES prism_user_auths_l (auth_id) ON DELETE CASCADE,
          password_reset_token_hash TEXT        NOT NULL,
          expires_at                TIMESTAMPTZ NOT NULL,
          used_at                   TIMESTAMPTZ,
          created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_auth_id
          ON prism_password_reset_tokens_l (auth_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
          ON prism_password_reset_tokens_l (password_reset_token_hash)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_password_reset_tokens_hash
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_password_reset_tokens_auth_id
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS prism_password_reset_tokens_l
    `);
  }
}
