import { Module } from '@nestjs/common';
import { InternalRepository } from '@/modules/internal/repository';
import { InternalTokenService } from '@/modules/internal/services';
import { InternalUseCase } from '@/modules/internal/usecases';

@Module({
  providers: [InternalRepository, InternalTokenService, InternalUseCase],
  exports: [InternalUseCase],
})
export class InternalModule {}
