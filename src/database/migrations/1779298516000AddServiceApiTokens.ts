import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceApiTokens1779298516000 implements MigrationInterface {
  name = 'AddServiceApiTokens1779298516000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_service_accounts_m
      (
          service_account_id UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
          name               VARCHAR(80) NOT NULL,
          description        VARCHAR(1000),
          is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_service_accounts_name UNIQUE (name),
          CONSTRAINT ck_service_accounts_name_not_blank CHECK (LENGTH(TRIM(name)) > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_accounts_active
          ON prism_service_accounts_m (is_active)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prism_service_api_tokens_l
      (
          api_token_id       UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
          service_account_id UUID         NOT NULL REFERENCES prism_service_accounts_m (service_account_id) ON DELETE CASCADE,
          name               VARCHAR(80)  NOT NULL,
          token_prefix       VARCHAR(64)  NOT NULL,
          token_hash         TEXT         NOT NULL,
          scopes             TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
          expires_at         TIMESTAMPTZ  NOT NULL,
          last_used_at       TIMESTAMPTZ,
          revoked_at         TIMESTAMPTZ,
          created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_service_api_tokens_prefix UNIQUE (token_prefix),
          CONSTRAINT ck_service_api_tokens_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
          CONSTRAINT ck_service_api_tokens_prefix_not_blank CHECK (LENGTH(TRIM(token_prefix)) > 0),
          CONSTRAINT ck_service_api_tokens_scopes_not_null CHECK (array_position(scopes, NULL::TEXT) IS NULL),
          CONSTRAINT ck_service_api_tokens_scopes_not_blank CHECK (array_position(scopes, '') IS NULL),
          CONSTRAINT ck_service_api_tokens_expires_after_created CHECK (expires_at > created_at)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_api_tokens_service_account_id
          ON prism_service_api_tokens_l (service_account_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_api_tokens_active
          ON prism_service_api_tokens_l (service_account_id, expires_at)
          WHERE revoked_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_api_tokens_last_used_at
          ON prism_service_api_tokens_l (last_used_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS prism_service_api_tokens_l');
    await queryRunner.query('DROP TABLE IF EXISTS prism_service_accounts_m');
  }
}
