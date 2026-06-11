import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import { DocumentRepository } from '@/modules/document/repository';
import { GithubModule } from '@/modules/github';
import { NotificationModule } from '@/modules/notification';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';
import {
  CommentController,
  PullRequestController,
  ProjectController,
  WorkItemController,
  WorkItemLookupController,
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
  PullRequestUseCase,
  ProjectRealtimeSubscriptionUseCase,
  ProjectUseCase,
  WorkItemUseCase,
} from '@/modules/project/usecases';

@Module({
  imports: [AdminModule, GithubModule, NotificationModule, WorkspaceModule],
  controllers: [
    ProjectController,
    WorkItemLookupController,
    WorkItemController,
    CommentController,
    PullRequestController,
  ],
  providers: [
    CommentRepository,
    DocumentRepository,
    ProjectRepository,
    WorkItemRepository,
    CommentUseCase,
    PullRequestUseCase,
    ProjectGateway,
    ProjectRealtimePublisherService,
    ProjectRealtimeSubscriptionUseCase,
    ProjectUseCase,
    WorkItemUseCase,
  ],
  exports: [ProjectRealtimePublisherService],
})
export class ProjectModule {}
