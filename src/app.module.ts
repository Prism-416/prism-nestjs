import 'dotenv/config';
import { Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CommonModule } from '@/common/common.module';
import { envValidationSchema } from '@/config/env.validation';
import { buildTypeOrmOptions } from '@/database/typeorm.options';
import { AuthModule } from '@/modules/auth/auth.module';

const dbEnabled = (process.env.DB_ENABLED ?? 'false').toLowerCase() === 'true';

type FeatureRegistration = {
  module: Type<unknown>;
  path?: string;
};

const featureRegistrations: FeatureRegistration[] = [
  {
    module: AuthModule,
    path: 'auth',
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
  CommonModule,
];

const buildFeatureImports = (registrations: FeatureRegistration[]) =>
  registrations.map((registration) => registration.module);

const buildFeatureRoutes = (registrations: FeatureRegistration[]) =>
  registrations
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
  ],
})
export class AppModule {}
