import { Module } from '@nestjs/common';
import { InternalAuthenticationGuard } from '@/modules/internal/guards';
import { InternalRepository } from '@/modules/internal/repository';
import { InternalTokenService } from '@/modules/internal/services';
import { InternalUseCase } from '@/modules/internal/usecases';

@Module({
  providers: [
    InternalRepository,
    InternalTokenService,
    InternalUseCase,
    InternalAuthenticationGuard,
  ],
  exports: [InternalUseCase, InternalAuthenticationGuard],
})
export class InternalModule {}
