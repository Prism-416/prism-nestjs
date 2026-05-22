import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_ACTOR_TYPES,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/modules/admin/types';
import type {
  AdminAuditAction,
  AdminAuditActorType,
  AdminAuditTargetType,
} from '@/modules/admin/types';
import { normalizeOptionalTrimmedString } from '@/modules/admin/utils';

export class SearchAdminAuditEventsQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_AUDIT_ACTIONS })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_AUDIT_ACTIONS)
  action?: AdminAuditAction;

  @ApiPropertyOptional({ enum: ADMIN_AUDIT_TARGET_TYPES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_AUDIT_TARGET_TYPES)
  targetType?: AdminAuditTargetType;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetId?: string;

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

export class AdminAuditEventResponseDto {
  @ApiProperty()
  auditEventId!: string;

  @ApiProperty({ enum: ADMIN_AUDIT_ACTOR_TYPES })
  actorType!: AdminAuditActorType;

  @ApiProperty({ nullable: true })
  actorId!: string | null;

  @ApiProperty({ enum: ADMIN_AUDIT_ACTIONS })
  action!: AdminAuditAction;

  @ApiProperty({ enum: ADMIN_AUDIT_TARGET_TYPES })
  targetType!: AdminAuditTargetType;

  @ApiProperty({ nullable: true })
  targetId!: string | null;

  @ApiProperty({ nullable: true })
  targetName!: string | null;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SearchAdminAuditEventsResponseDto {
  @ApiProperty({ type: [AdminAuditEventResponseDto] })
  items!: AdminAuditEventResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
