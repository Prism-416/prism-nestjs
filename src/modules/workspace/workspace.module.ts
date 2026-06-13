import { Module } from '@nestjs/common';
import { OciEmailModule } from '@/core/email';
import { AdminModule } from '@/modules/admin';
import { AgentModule } from '@/modules/agent/agent.module';
import { GithubModule } from '@/modules/github';
import { NotificationModule } from '@/modules/notification';
import {
  FeatureProvisioningController,
  WorkspaceController,
  WorkspaceRepositoryLinkController,
} from '@/modules/workspace/controller';
import { WorkspaceGateway } from '@/modules/workspace/gateway';
import {
  WorkspaceRepository,
  WorkspaceRepositoryLinkRepository,
} from '@/modules/workspace/repository';
import {
  FeatureProvisioningDispatchService,
  WorkspaceRealtimePublisherService,
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import {
  FeatureProvisioningUseCase,
  WorkspaceRealtimeSubscriptionUseCase,
  WorkspaceRepositoryLinkUseCase,
  WorkspaceUseCase,
} from '@/modules/workspace/usecases';

@Module({
  imports: [
    AdminModule,
    AgentModule,
    GithubModule,
    NotificationModule,
    OciEmailModule,
  ],
  controllers: [
    WorkspaceController,
    WorkspaceRepositoryLinkController,
    FeatureProvisioningController,
  ],
  providers: [
    WorkspaceRepository,
    WorkspaceRepositoryLinkRepository,
    FeatureProvisioningDispatchService,
    FeatureProvisioningUseCase,
    WorkspaceGateway,
    WorkspaceInvitationNotifierService,
    WorkspaceProvisioningService,
    WorkspaceRealtimePublisherService,
    WorkspaceRealtimeSubscriptionUseCase,
    WorkspaceRepositoryLinkUseCase,
    WorkspaceUseCase,
  ],
  exports: [
    WorkspaceRealtimePublisherService,
    WorkspaceRepository,
    WorkspaceProvisioningService,
  ],
})
export class WorkspaceModule {}
