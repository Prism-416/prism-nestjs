import { Module } from '@nestjs/common';
import {
  CommentController,
  ProjectController,
  WorkItemController,
} from '@/modules/project/controller';
import {
  CommentRepository,
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';
import {
  CommentUseCase,
  ProjectUseCase,
  WorkItemUseCase,
} from '@/modules/project/usecases';

@Module({
  controllers: [ProjectController, WorkItemController, CommentController],
  providers: [
    CommentRepository,
    ProjectRepository,
    WorkItemRepository,
    CommentUseCase,
    ProjectUseCase,
    WorkItemUseCase,
  ],
})
export class ProjectModule {}
