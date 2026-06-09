import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import { SprintController } from '@/modules/sprint/controller';
import { SprintRepository } from '@/modules/sprint/repository';
import { SprintUseCase } from '@/modules/sprint/usecases';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';

@Module({
  imports: [AdminModule, WorkspaceModule],
  controllers: [SprintController],
  providers: [SprintRepository, SprintUseCase],
})
export class SprintModule {}
