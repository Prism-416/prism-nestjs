import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const quotePostgresIdentifier = (value: string) =>
  `"${value.replace(/"/g, '""')}"`;

export async function applyPostgresSearchPath(dataSource: DataSource) {
  const postgresOptions = dataSource.options as DataSourceOptions & {
    schema?: string;
  };
  const schema =
    typeof postgresOptions.schema === 'string'
      ? postgresOptions.schema.trim()
      : '';

  if (!schema || dataSource.options.type !== 'postgres') {
    return;
  }

  const setSearchPathSql = `SET search_path TO ${quotePostgresIdentifier(schema)}`;
  const driver = dataSource.driver as {
    master?: {
      on?: (
        event: string,
        listener: (client: {
          query: (sql: string) => Promise<unknown>;
        }) => void,
      ) => void;
    };
  };

  driver.master?.on?.('connect', (client) => {
    void client.query(setSearchPathSql);
  });

  await dataSource.query(setSearchPathSql);
}

export function buildDataSourceOptions(): DataSourceOptions {
  const schema = process.env.PG_SCHEMA || undefined;

  return {
    type: 'postgres',
    host: process.env.PG_HOST ?? '127.0.0.1',
    port: Number(process.env.PG_PORT ?? 5432),
    username: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? 'postgres',
    database: process.env.PG_DB ?? 'nestjs_template',
    schema,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  };
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return buildDataSourceOptions();
}
