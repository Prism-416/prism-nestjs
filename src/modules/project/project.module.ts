import { Module } from '@nestjs/common';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';
import { ProjectController } from '@/modules/project/controller';
import { ProjectRepository } from '@/modules/project/repository';
import { ProjectUseCase } from '@/modules/project/usecases';

@Module({
  imports: [WorkspaceModule],
  controllers: [ProjectController],
  providers: [ProjectRepository, ProjectUseCase],
})
export class ProjectModule {}
