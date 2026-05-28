import { Module } from '@nestjs/common';
import { NotificationModule } from '@/modules/notification';
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
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import {
  CommentUseCase,
  ProjectRealtimeSubscriptionUseCase,
  ProjectUseCase,
  WorkItemUseCase,
} from '@/modules/project/usecases';

@Module({
  imports: [NotificationModule],
  controllers: [ProjectController, WorkItemController, CommentController],
  providers: [
    CommentRepository,
    ProjectRepository,
    WorkItemRepository,
    CommentUseCase,
    ProjectGateway,
    ProjectRealtimePublisherService,
    ProjectRealtimeSubscriptionUseCase,
    ProjectUseCase,
    WorkItemUseCase,
  ],
  exports: [ProjectRealtimePublisherService],
})
export class ProjectModule {}
