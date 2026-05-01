import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeProjectSlugGloballyUnique1777593600000 implements MigrationInterface {
  name = 'MakeProjectSlugGloballyUnique1777593600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        DROP CONSTRAINT IF EXISTS uq_projects_workspace_slug
    `);
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        DROP CONSTRAINT IF EXISTS uq_projects_slug
    `);
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        ADD CONSTRAINT uq_projects_slug UNIQUE (slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        DROP CONSTRAINT IF EXISTS uq_projects_slug
    `);
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        DROP CONSTRAINT IF EXISTS uq_projects_workspace_slug
    `);
    await queryRunner.query(`
      ALTER TABLE prism_projects_l
        ADD CONSTRAINT uq_projects_workspace_slug UNIQUE (workspace_id, slug)
    `);
  }
}
