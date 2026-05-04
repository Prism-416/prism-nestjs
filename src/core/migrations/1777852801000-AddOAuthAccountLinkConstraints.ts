import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthAccountLinkConstraints1777852801000 implements MigrationInterface {
  name = 'AddOAuthAccountLinkConstraints1777852801000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auths_provider_user_id
          ON prism_user_auths_l (provider, provider_user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auths_user_oauth_provider
          ON prism_user_auths_l (user_id, provider)
          WHERE provider IN ('google', 'github')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_user_auths_user_oauth_provider
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_user_auths_provider_user_id
    `);
  }
}
