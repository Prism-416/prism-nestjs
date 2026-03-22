import { Module } from '@nestjs/common';
import { WorkspaceController } from '@/modules/workspace/controller';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceUseCase } from '@/modules/workspace/usecases';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceRepository, WorkspaceUseCase],
})
export class WorkspaceModule {}
