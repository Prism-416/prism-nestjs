import 'dotenv/config';
import { Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CoreModule } from '@/core/core.module';
import { DataResponseInterceptor } from '@/core/response';
import { envValidationSchema } from '@/core/config/env.validation';
import { buildTypeOrmOptions } from '@/core/database/typeorm.options';
import { AgentModule } from '@/modules/agent/agent.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { DocumentModule } from '@/modules/document/document.module';
import { EmbeddingModule } from '@/modules/embedding/embedding.module';
import { AdminModule } from '@/modules/admin';
import { OnboardingModule } from '@/modules/onboarding/onboarding.module';
import { ProjectModule } from '@/modules/project/project.module';
import { SprintModule } from '@/modules/sprint/sprint.module';
import { UserModule } from '@/modules/user/user.module';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';

const dbEnabled = (process.env.DB_ENABLED ?? 'false').toLowerCase() === 'true';

type FeatureRegistration = {
  module: Type<unknown>;
  path?: string;
  requiresDb?: boolean;
};

const featureRegistrations: FeatureRegistration[] = [
  {
    module: AuthModule,
    path: 'auth',
    requiresDb: true,
  },
  {
    module: OnboardingModule,
    requiresDb: true,
  },
  {
    module: UserModule,
    path: 'users',
    requiresDb: true,
  },
  {
    module: WorkspaceModule,
    path: 'workspaces',
    requiresDb: true,
  },
  {
    module: ProjectModule,
    path: 'projects',
    requiresDb: true,
  },
  {
    module: AgentModule,
    path: 'projects',
    requiresDb: true,
  },
  {
    module: DocumentModule,
    path: 'projects',
    requiresDb: true,
  },
  {
    module: EmbeddingModule,
    path: 'projects',
    requiresDb: true,
  },
  {
    module: AdminModule,
    path: 'admin',
    requiresDb: true,
  },
  {
    module: SprintModule,
    path: 'projects',
    requiresDb: true,
  },
];

const buildCoreImports = () => [
  ConfigModule.forRoot({
    isGlobal: true,
    validationSchema: envValidationSchema,
    validationOptions: {
      abortEarly: false,
      allowUnknown: true,
    },
  }),
  ThrottlerModule.forRoot([
    {
      ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60000),
      limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
    },
  ]),
  ...(dbEnabled ? [TypeOrmModule.forRoot(buildTypeOrmOptions())] : []),
  CoreModule,
];

const buildFeatureImports = (registrations: FeatureRegistration[]) =>
  registrations
    .filter((registration) => dbEnabled || !registration.requiresDb)
    .map((registration) => registration.module);

const buildFeatureRoutes = (registrations: FeatureRegistration[]) =>
  registrations
    .filter((registration) => dbEnabled || !registration.requiresDb)
    .filter((registration) => registration.path)
    .map((registration) => ({
      path: registration.path as string,
      module: registration.module,
    }));

const buildAppImports = () => [
  ...buildCoreImports(),
  ...buildFeatureImports(featureRegistrations),
  RouterModule.register(buildFeatureRoutes(featureRegistrations)),
];

@Module({
  imports: buildAppImports(),
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DataResponseInterceptor,
    },
  ],
})
export class AppModule {}
