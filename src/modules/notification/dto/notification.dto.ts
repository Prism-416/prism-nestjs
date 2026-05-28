import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  NOTIFICATION_TARGET_TYPES,
  NOTIFICATION_TYPES,
} from '@/modules/notification/types';
import type {
  NotificationTargetType,
  NotificationType,
} from '@/modules/notification/types';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value as unknown;
  })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class NotificationResponseDto {
  @ApiProperty()
  notificationId!: string;

  @ApiProperty()
  recipientUserId!: string;

  @ApiProperty({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true })
  projectId!: string | null;

  @ApiProperty({ enum: NOTIFICATION_TYPES })
  notificationType!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: NOTIFICATION_TARGET_TYPES })
  targetType!: NotificationTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiProperty({ nullable: true })
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ListNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications!: NotificationResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
