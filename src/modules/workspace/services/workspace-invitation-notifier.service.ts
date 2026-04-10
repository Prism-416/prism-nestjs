import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciEmailDeliveryService } from '@/core/email';
import { WorkspaceInvitationResponseDto } from '@/modules/workspace/dto';
import { WorkspaceUserRow } from '@/modules/workspace/types';

@Injectable()
export class WorkspaceInvitationNotifierService {
  private readonly logger = new Logger(WorkspaceInvitationNotifierService.name);
  private readonly emailEnabled: boolean;

  constructor(
    private readonly emailDelivery: OciEmailDeliveryService,
    private readonly configService: ConfigService,
  ) {
    this.emailEnabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
  }

  async sendWorkspaceInvitation(
    workspaceName: string,
    invitation: WorkspaceInvitationResponseDto,
    receiver: WorkspaceUserRow,
  ): Promise<void> {
    if (!this.emailEnabled) {
      return;
    }

    const destination = invitation.invitationLink;
    try {
      await this.emailDelivery.sendEmail({
        to: [{ email: receiver.email, name: receiver.fullName }],
        subject: `Invitation to join ${workspaceName}`,
        bodyText: destination.startsWith('http')
          ? `You have been invited to join ${workspaceName} as ${invitation.role}. Open this link to continue: ${destination}`
          : `You have been invited to join ${workspaceName} as ${invitation.role}. Your invitation token is: ${destination}`,
      });

      this.logger.log(
        `Workspace invitation sent: workspace=${invitation.workspaceId}, receiver=${receiver.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Workspace invitation delivery failed: workspace=${invitation.workspaceId}, receiver=${receiver.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
