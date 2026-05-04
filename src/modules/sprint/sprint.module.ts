import { Module } from '@nestjs/common';
import { SprintController } from '@/modules/sprint/controller';
import { SprintRepository } from '@/modules/sprint/repository';
import { SprintUseCase } from '@/modules/sprint/usecases';

@Module({
  controllers: [SprintController],
  providers: [SprintRepository, SprintUseCase],
})
export class SprintModule {}
