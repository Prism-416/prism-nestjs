import { Module } from '@nestjs/common';
import { OciEmailModule } from '@/core/email';
import { AdminModule } from '@/modules/admin';
import { GithubModule } from '@/modules/github';
import {
  FeatureProvisioningController,
  WorkspaceController,
  WorkspaceRepositoryLinkController,
} from '@/modules/workspace/controller';
import {
  WorkspaceRepository,
  WorkspaceRepositoryLinkRepository,
} from '@/modules/workspace/repository';
import {
  FeatureProvisioningDispatchService,
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import {
  FeatureProvisioningUseCase,
  WorkspaceRepositoryLinkUseCase,
  WorkspaceUseCase,
} from '@/modules/workspace/usecases';

@Module({
  imports: [AdminModule, GithubModule, OciEmailModule],
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
    WorkspaceInvitationNotifierService,
    WorkspaceProvisioningService,
    WorkspaceRepositoryLinkUseCase,
    WorkspaceUseCase,
  ],
  exports: [WorkspaceRepository, WorkspaceProvisioningService],
})
export class WorkspaceModule {}
