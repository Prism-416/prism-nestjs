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

export class IncreaseAgentStepTitleLength1781700000000 implements MigrationInterface {
  name = 'IncreaseAgentStepTitleLength1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      ALTER TABLE prism_agent_steps_l
        ALTER COLUMN title TYPE VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyConfiguredSchema(queryRunner);

    await queryRunner.query(`
      UPDATE prism_agent_steps_l
      SET title = LEFT(title, 100)
      WHERE LENGTH(title) > 100
    `);

    await queryRunner.query(`
      ALTER TABLE prism_agent_steps_l
        ALTER COLUMN title TYPE VARCHAR(100)
    `);
  }
}
