import { Injectable, Logger } from '@nestjs/common';
import { OciEmailDeliveryService } from '@/core/email';
import { WorkspaceInvitationResponseDto } from '@/modules/workspace/dto';
import { WorkspaceInvitationReceiver } from '@/modules/workspace/types';

@Injectable()
export class WorkspaceInvitationNotifierService {
  private readonly logger = new Logger(WorkspaceInvitationNotifierService.name);

  constructor(private readonly emailDelivery: OciEmailDeliveryService) {}

  async sendWorkspaceInvitation(
    workspaceName: string,
    invitation: WorkspaceInvitationResponseDto,
    receiver: WorkspaceInvitationReceiver,
  ): Promise<void> {
    const destination = invitation.invitationLink;
    try {
      await this.emailDelivery.sendEmail({
        to: [{ email: receiver.email, name: receiver.fullName ?? undefined }],
        subject: `Invitation to join ${workspaceName}`,
        bodyText: `You have been invited to join ${workspaceName} as ${invitation.role}. Review the invitation here: ${destination}`,
      });

      this.logger.log(
        `Workspace invitation sent: workspace=${invitation.workspaceId}, receiver=${receiver.userId ?? receiver.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Workspace invitation delivery failed: workspace=${invitation.workspaceId}, receiver=${receiver.userId ?? receiver.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
