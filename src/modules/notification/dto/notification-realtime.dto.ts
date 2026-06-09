import { NotificationResponseDto } from '@/modules/notification/dto/notification.dto';
import { WorkspaceResponseDto } from '@/modules/workspace/dto';

export class NotificationCreatedPayloadDto extends NotificationResponseDto {}

export class WorkspaceAddedPayloadDto extends WorkspaceResponseDto {
  recipientUserId!: string;
}
