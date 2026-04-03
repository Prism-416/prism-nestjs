import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/common/errors/global-exception.filter';

const resolveSwaggerServerUrl = (requestUrl?: string) => {
  const normalizedUrl = requestUrl?.split('?')[0] ?? '';
  const docsSuffixPattern = /\/docs(?:-json|-yaml)?\/?$/;

  if (!normalizedUrl || !docsSuffixPattern.test(normalizedUrl)) {
    return '/';
  }

  const basePath = normalizedUrl.replace(docsSuffixPattern, '') || '/';

  return basePath.startsWith('/') ? basePath : `/${basePath}`;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(appDescription)
    .setVersion(appVersion)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    patchDocumentOnRequest: (req, _res, document) => ({
      ...document,
      servers: [
        {
          url: resolveSwaggerServerUrl(
            (req as Request).originalUrl ?? (req as Request).url,
          ),
        },
      ],
    }),
  });
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
