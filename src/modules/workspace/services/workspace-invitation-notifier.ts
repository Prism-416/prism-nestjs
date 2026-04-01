import { WorkspaceInvitationResponseDto } from '@/modules/workspace/dto';
import { WorkspaceUserRow } from '@/modules/workspace/types';

export abstract class WorkspaceInvitationNotifier {
  abstract sendWorkspaceInvitation(
    workspaceName: string,
    invitation: WorkspaceInvitationResponseDto,
    receiver: WorkspaceUserRow,
  ): Promise<void>;
}
