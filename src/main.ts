import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/core/errors/global-exception.filter';
import { applyPostgresSearchPath } from '@/core/database/typeorm.options';
import { DataSource } from 'typeorm';

const resolveSwaggerServerUrl = (nodeEnv?: string) => {
  switch (nodeEnv) {
    case 'development':
      return '/dev';
    case 'production':
      return '/prod';
    case 'local':
    default:
      return '/';
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource, { strict: false });

  if (dataSource?.isInitialized) {
    await applyPostgresSearchPath(dataSource);
  }

  const corsOrigin = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const logger = new Logger('HTTP');
  app.use(helmet());
  app.use(compression());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      logger.log(
        `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  });
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });
  app.enableShutdownHooks();
  const appName = process.env.APP_NAME ?? 'NestJS API';
  const appDescription =
    process.env.APP_DESCRIPTION ?? 'Reusable NestJS backend template';
  const appVersion = process.env.APP_VERSION ?? '1.0.0';
  const swaggerServerUrl = resolveSwaggerServerUrl(process.env.NODE_ENV);
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(appDescription)
    .setVersion(appVersion)
    .addServer(swaggerServerUrl)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'Internal API token' },
      'internal',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
