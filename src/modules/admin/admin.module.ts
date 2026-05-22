import { Module } from '@nestjs/common';
import {
  AdminAuditController,
  AdminServiceTokenController,
} from '@/modules/admin/controller';
import {
  AdminAuthenticationGuard,
  InternalAuthenticationGuard,
} from '@/modules/admin/guards';
import {
  AdminAuditRepository,
  InternalRepository,
} from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import { AdminAuditUseCase, InternalUseCase } from '@/modules/admin/usecases';

@Module({
  controllers: [AdminAuditController, AdminServiceTokenController],
  providers: [
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
