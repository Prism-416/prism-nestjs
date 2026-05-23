import { Module } from '@nestjs/common';
import {
  AdminAuditController,
  AdminEmbeddingJobController,
  AdminServiceTokenController,
} from '@/modules/admin/controller';
import {
  AdminAuthenticationGuard,
  InternalAuthenticationGuard,
} from '@/modules/admin/guards';
import {
  AdminAuditRepository,
  AdminEmbeddingJobRepository,
  InternalRepository,
} from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import {
  AdminAuditUseCase,
  AdminEmbeddingJobUseCase,
  InternalUseCase,
} from '@/modules/admin/usecases';

@Module({
  controllers: [
    AdminAuditController,
    AdminEmbeddingJobController,
    AdminServiceTokenController,
  ],
  providers: [
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
