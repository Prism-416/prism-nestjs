import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import { GithubModule } from '@/modules/github';
import { NotificationModule } from '@/modules/notification';
import {
  CommentController,
  ProjectController,
  ProjectRepositoryLinkController,
  WorkItemController,
} from '@/modules/project/controller';
import { ProjectGateway } from '@/modules/project/gateway';
import {
  CommentRepository,
  ProjectRepository,
  ProjectRepositoryLinkRepository,
  WorkItemRepository,
} from '@/modules/project/repository';
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import {
  CommentUseCase,
  ProjectRealtimeSubscriptionUseCase,
  ProjectRepositoryLinkUseCase,
  ProjectUseCase,
  WorkItemUseCase,
} from '@/modules/project/usecases';

@Module({
  imports: [AdminModule, GithubModule, NotificationModule],
  controllers: [
    ProjectController,
    ProjectRepositoryLinkController,
    WorkItemController,
    CommentController,
  ],
  providers: [
    CommentRepository,
    ProjectRepository,
    ProjectRepositoryLinkRepository,
    WorkItemRepository,
    CommentUseCase,
    ProjectGateway,
    ProjectRealtimePublisherService,
    ProjectRealtimeSubscriptionUseCase,
    ProjectRepositoryLinkUseCase,
    ProjectUseCase,
    WorkItemUseCase,
  ],
  exports: [ProjectRealtimePublisherService],
})
export class ProjectModule {}
