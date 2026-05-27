import { Module } from '@nestjs/common';
import { OciEmailModule } from '@/core/email';
import {
  FeatureProvisioningController,
  WorkspaceController,
} from '@/modules/workspace/controller';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import {
  FeatureProvisioningDispatchService,
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import {
  FeatureProvisioningUseCase,
  WorkspaceUseCase,
} from '@/modules/workspace/usecases';

@Module({
  imports: [OciEmailModule],
  controllers: [WorkspaceController, FeatureProvisioningController],
  providers: [
    WorkspaceRepository,
    FeatureProvisioningDispatchService,
    FeatureProvisioningUseCase,
    WorkspaceInvitationNotifierService,
    WorkspaceProvisioningService,
    WorkspaceUseCase,
  ],
  exports: [WorkspaceRepository, WorkspaceProvisioningService],
})
export class WorkspaceModule {}
