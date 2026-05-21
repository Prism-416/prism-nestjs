import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import {
  applyPostgresSearchPath,
  buildTypeOrmOptions,
} from '@/core/database/typeorm.options';
import { InternalRepository } from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import { InternalUseCase } from '@/modules/admin/usecases';
import { INTERNAL_SCOPES, InternalScope } from '@/modules/admin/types';

type CreateServiceTokenOptions = {
  serviceName: string;
  serviceDescription?: string;
  tokenName: string;
  scopes: InternalScope[];
  expiresAt: Date;
};

const DEFAULT_EXPIRES_IN_DAYS = 90;

process.env.DB_ENABLED = process.env.DB_ENABLED ?? 'true';

@Module({
  imports: [TypeOrmModule.forRoot(buildTypeOrmOptions())],
  providers: [
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    UnitOfWork,
  ],
})
class InternalServiceTokenCliModule {}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(
    InternalServiceTokenCliModule,
    {
      logger: ['error', 'warn'],
    },
  );

  try {
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      await applyPostgresSearchPath(dataSource);
    }

    const usecase = app.get(InternalUseCase);
    const created = await usecase.createServiceApiTokenForServiceName({
      serviceName: options.serviceName,
      serviceDescription: options.serviceDescription,
      tokenName: options.tokenName,
      scopes: options.scopes,
      expiresAt: options.expiresAt,
    });

    process.stdout.write(
      [
        `serviceAccountId=${created.apiToken.serviceAccountId}`,
        `apiTokenId=${created.apiToken.apiTokenId}`,
        `tokenPrefix=${created.apiToken.tokenPrefix}`,
        `expiresAt=${created.apiToken.expiresAt.toISOString()}`,
        `token=${created.token}`,
        '',
      ].join('\n'),
    );
  } finally {
    await app.close();
  }
}

function parseArgs(args: string[]): CreateServiceTokenOptions {
  const values = readFlagValues(args);
  const serviceName = readRequired(values, 'service-name');
  const tokenName = values.get('token-name') ?? `${serviceName} token`;
  const scopes = parseScopes(readRequired(values, 'scopes'));

  return {
    serviceName,
    serviceDescription: values.get('description'),
    tokenName,
    scopes,
    expiresAt: parseExpiresAt(values),
  };
}

function readFlagValues(args: string[]): Map<string, string> {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (!key || !value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    values.set(key, value);
    index += 1;
  }

  return values;
}

function readRequired(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`Missing required --${key}`);
  }

  return value;
}

function parseScopes(value: string): InternalScope[] {
  const allowedScopes = new Set<string>(INTERNAL_SCOPES);
  const scopes = [...new Set(value.split(',').map((scope) => scope.trim()))];

  if (
    scopes.length === 0 ||
    scopes.some((scope) => !scope || !allowedScopes.has(scope))
  ) {
    throw new Error(
      `Invalid scopes. Allowed scopes: ${INTERNAL_SCOPES.join(', ')}`,
    );
  }

  return scopes as InternalScope[];
}

function parseExpiresAt(values: Map<string, string>): Date {
  const expiresAt = values.get('expires-at');
  if (expiresAt) {
    return parseDate(expiresAt, '--expires-at');
  }

  const expiresInDays = values.get('expires-in-days');
  const days = expiresInDays ? Number(expiresInDays) : DEFAULT_EXPIRES_IN_DAYS;
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('--expires-in-days must be a positive integer');
  }

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }

  return date;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
