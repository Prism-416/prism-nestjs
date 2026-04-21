import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  normalizeTrimmedString,
  normalizeOptionalTrimmedString,
} from '@/modules/project/utils';
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
} from '@/modules/project/types';
import type {
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from '@/modules/project/types';

function normalizeTrimmedStringArray(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => normalizeTrimmedString(item));
}

export class CreateWorkItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  description!: string;

  @ApiProperty({ enum: WORK_ITEM_TYPES })
  @IsIn(WORK_ITEM_TYPES)
  type!: WorkItemType;

  @ApiPropertyOptional({ enum: WORK_ITEM_PRIORITIES, default: 'medium' })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_PRIORITIES)
  priority?: WorkItemPriority;

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => normalizeTrimmedStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(30, { each: true })
  assigneeUsernames?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => normalizeTrimmedStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(20, { each: true })
  labelNames?: string[];
}

export class WorkItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: WORK_ITEM_TYPES })
  type!: WorkItemType;

  @ApiProperty({ enum: WORK_ITEM_PRIORITIES })
  priority!: WorkItemPriority;

  @ApiProperty({ enum: WORK_ITEM_STATUSES })
  status!: WorkItemStatus;

  @ApiProperty()
  statusChangedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [String] })
  assigneeUsernames!: string[];

  @ApiProperty({ type: [String] })
  labelNames!: string[];
}
