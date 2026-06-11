import { Module } from '@nestjs/common';
import {
  AdminAuditController,
  AdminEmbeddingCoverageController,
  AdminEmbeddingJobController,
  AdminServiceTokenController,
  AdminUserMetricsController,
} from '@/modules/admin/controller';
import {
  AdminAuthenticationGuard,
  InternalAuthenticationGuard,
} from '@/modules/admin/guards';
import {
  AdminAuditRepository,
  AdminEmbeddingCoverageRepository,
  AdminEmbeddingJobRepository,
  AdminUserMetricsRepository,
  InternalRepository,
} from '@/modules/admin/repository';
import {
  AdminPasswordAttemptLimiterService,
  InternalTokenService,
} from '@/modules/admin/services';
import {
  AdminAuditUseCase,
  AdminEmbeddingCoverageUseCase,
  AdminEmbeddingJobUseCase,
  AdminUserMetricsUseCase,
  InternalUseCase,
} from '@/modules/admin/usecases';

@Module({
  controllers: [
    AdminAuditController,
    AdminEmbeddingCoverageController,
    AdminEmbeddingJobController,
    AdminServiceTokenController,
    AdminUserMetricsController,
  ],
  providers: [
    AdminEmbeddingCoverageRepository,
    AdminEmbeddingCoverageUseCase,
    AdminEmbeddingJobRepository,
    AdminEmbeddingJobUseCase,
    AdminUserMetricsRepository,
    AdminUserMetricsUseCase,
    AdminAuditRepository,
    AdminAuditUseCase,
    AdminPasswordAttemptLimiterService,
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    AdminAuthenticationGuard,
    InternalAuthenticationGuard,
  ],
  exports: [InternalUseCase, InternalAuthenticationGuard],
})
export class AdminModule {}
