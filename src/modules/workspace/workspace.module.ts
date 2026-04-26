import { Module } from '@nestjs/common';
import { OciEmailModule } from '@/core/email';
import { ProjectRepository } from '@/modules/project/repository';
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
    ProjectRepository,
    WorkspaceRepository,
    WorkspaceInvitationNotifierService,
    WorkspaceProvisioningService,
    WorkspaceUseCase,
  ],
  exports: [WorkspaceRepository, WorkspaceProvisioningService],
})
export class WorkspaceModule {}
