import { Module } from '@nestjs/common';
import {
  CommentController,
  ProjectController,
  WorkItemController,
} from '@/modules/project/controller';
import { ProjectGateway } from '@/modules/project/gateway';
import {
  CommentRepository,
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';
import {
  CommentUseCase,
  ProjectRealtimeSubscriptionUseCase,
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
    ProjectGateway,
    ProjectRealtimeSubscriptionUseCase,
    ProjectUseCase,
    WorkItemUseCase,
  ],
})
export class ProjectModule {}
