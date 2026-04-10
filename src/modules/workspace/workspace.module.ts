import { Module } from '@nestjs/common';
import { OciEmailModule } from '@/common/email';
import { WorkspaceController } from '@/modules/workspace/controller';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import {
  WorkspaceInvitationNotifierService,
  WorkspaceProvisioningService,
} from '@/modules/workspace/services';
import { WorkspaceUseCase } from '@/modules/workspace/usecases';

@Module({
  imports: [OciEmailModule],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceRepository,
    WorkspaceInvitationNotifierService,
    WorkspaceProvisioningService,
    WorkspaceUseCase,
  ],
  exports: [WorkspaceRepository, WorkspaceProvisioningService],
})
export class WorkspaceModule {}
