import { Module } from '@nestjs/common';
import {
  AdminAuditController,
  AdminEmbeddingCoverageController,
  AdminEmbeddingJobController,
  AdminServiceTokenController,
} from '@/modules/admin/controller';
import {
  AdminAuthenticationGuard,
  InternalAuthenticationGuard,
} from '@/modules/admin/guards';
import {
  AdminAuditRepository,
  AdminEmbeddingCoverageRepository,
  AdminEmbeddingJobRepository,
  InternalRepository,
} from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import {
  AdminAuditUseCase,
  AdminEmbeddingCoverageUseCase,
  AdminEmbeddingJobUseCase,
  InternalUseCase,
} from '@/modules/admin/usecases';

@Module({
  controllers: [
    AdminAuditController,
    AdminEmbeddingCoverageController,
    AdminEmbeddingJobController,
    AdminServiceTokenController,
  ],
  providers: [
    AdminEmbeddingCoverageRepository,
    AdminEmbeddingCoverageUseCase,
    AdminEmbeddingJobRepository,
    AdminEmbeddingJobUseCase,
    AdminAuditRepository,
    AdminAuditUseCase,
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    AdminAuthenticationGuard,
    InternalAuthenticationGuard,
  ],
  exports: [InternalUseCase, InternalAuthenticationGuard],
})
export class AdminModule {}
