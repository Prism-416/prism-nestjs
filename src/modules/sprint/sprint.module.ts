import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import { SprintController } from '@/modules/sprint/controller';
import { SprintRepository } from '@/modules/sprint/repository';
import { SprintUseCase } from '@/modules/sprint/usecases';

@Module({
  imports: [AdminModule],
  controllers: [SprintController],
  providers: [SprintRepository, SprintUseCase],
})
export class SprintModule {}
