import { Module } from '@nestjs/common';
import { AdminServiceTokenController } from '@/modules/admin/controller';
import {
  AdminAuthenticationGuard,
  InternalAuthenticationGuard,
} from '@/modules/admin/guards';
import { InternalRepository } from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import { InternalUseCase } from '@/modules/admin/usecases';

@Module({
  controllers: [AdminServiceTokenController],
  providers: [
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    AdminAuthenticationGuard,
    InternalAuthenticationGuard,
  ],
  exports: [InternalUseCase, InternalAuthenticationGuard],
})
export class AdminModule {}
