import { Module } from '@nestjs/common';
import { InternalAuthenticationGuard } from '@/modules/admin/guards';
import { InternalRepository } from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import { InternalUseCase } from '@/modules/admin/usecases';

@Module({
  providers: [
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    InternalAuthenticationGuard,
  ],
  exports: [InternalUseCase, InternalAuthenticationGuard],
})
export class AdminModule {}
