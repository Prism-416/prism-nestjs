import { Module } from '@nestjs/common';
import {
  ProjectController,
  WorkItemController,
} from '@/modules/project/controller';
import {
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';
import { ProjectUseCase, WorkItemUseCase } from '@/modules/project/usecases';

@Module({
  controllers: [ProjectController, WorkItemController],
  providers: [
    ProjectRepository,
    WorkItemRepository,
    ProjectUseCase,
    WorkItemUseCase,
  ],
})
export class ProjectModule {}
