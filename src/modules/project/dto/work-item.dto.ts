import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PROJECT_EMBEDDING_DIMENSIONS } from '@/modules/project/constants';
import {
  normalizeTrimmedString,
  normalizeOptionalTrimmedString,
} from '@/modules/project/utils';
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
} from '@/modules/project/types';
import type { WorkItemPriority, WorkItemStatus } from '@/modules/project/types';

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
  @MaxLength(100)
  title!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  description!: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: WORK_ITEM_PRIORITIES, default: 'medium' })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_PRIORITIES)
  priority?: WorkItemPriority;

  @ApiPropertyOptional({ enum: WORK_ITEM_STATUSES, default: 'todo' })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_STATUSES)
  status?: WorkItemStatus;

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
  @MaxLength(30, { each: true })
  labelNames?: string[];
}

export class SearchWorkItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search against title and description',
  })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  topLevel?: boolean;

  @ApiPropertyOptional({ enum: WORK_ITEM_PRIORITIES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_PRIORITIES)
  priority?: WorkItemPriority;

  @ApiPropertyOptional({ enum: WORK_ITEM_STATUSES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_STATUSES)
  status?: WorkItemStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  assigneeUsername?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  labelName?: string;

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

export class UpdateWorkItemDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: WORK_ITEM_PRIORITIES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_PRIORITIES)
  priority?: WorkItemPriority;

  @ApiPropertyOptional({ enum: WORK_ITEM_STATUSES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(WORK_ITEM_STATUSES)
  status?: WorkItemStatus;

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
  @MaxLength(30, { each: true })
  labelNames?: string[];
}

export class ReorderWorkItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ enum: WORK_ITEM_STATUSES })
  @IsString()
  @IsIn(WORK_ITEM_STATUSES)
  status!: WorkItemStatus;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderWorkItemsDto {
  @ApiProperty({ type: [ReorderWorkItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: ReorderWorkItemDto) => item.itemId)
  @ValidateNested({ each: true })
  @Type(() => ReorderWorkItemDto)
  items!: ReorderWorkItemDto[];
}

export class CreateWorkItemForInternalDto extends CreateWorkItemDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class UpdateWorkItemForInternalDto extends UpdateWorkItemDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class ReorderWorkItemsForInternalDto extends ReorderWorkItemsDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class DeleteWorkItemForInternalDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class BulkWorkItemIdsDto {
  @ApiProperty({
    type: [String],
    description: 'Work item ids to act on',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  itemIds!: string[];
}

export class BulkDeleteWorkItemsDto extends BulkWorkItemIdsDto {}

export class WorkItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ enum: WORK_ITEM_PRIORITIES })
  priority!: WorkItemPriority;

  @ApiProperty({ enum: WORK_ITEM_STATUSES })
  status!: WorkItemStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  statusChangedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [String] })
  assigneeUsernames!: string[];

  @ApiProperty({ type: [String] })
  labelNames!: string[];
}

export class SearchWorkItemsResponseDto {
  @ApiProperty({ type: [WorkItemResponseDto] })
  items!: WorkItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class TrashedWorkItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ enum: WORK_ITEM_PRIORITIES })
  priority!: WorkItemPriority;

  @ApiProperty({ enum: WORK_ITEM_STATUSES })
  status!: WorkItemStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  statusChangedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ description: 'When the item was moved to trash' })
  deletedAt!: Date;

  @ApiProperty({
    description: 'Number of trashed descendants restored/removed together',
  })
  descendantCount!: number;

  @ApiProperty({ type: [String] })
  assigneeUsernames!: string[];

  @ApiProperty({ type: [String] })
  labelNames!: string[];
}

export class SearchTrashedWorkItemsResponseDto {
  @ApiProperty({ type: [TrashedWorkItemResponseDto] })
  items!: TrashedWorkItemResponseDto[];
}

export class UpsertWorkItemEmbeddingDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  embeddedTitle!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  embeddedDescription!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiPropertyOptional({
    default: PROJECT_EMBEDDING_DIMENSIONS,
    minimum: PROJECT_EMBEDDING_DIMENSIONS,
    maximum: PROJECT_EMBEDDING_DIMENSIONS,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(PROJECT_EMBEDDING_DIMENSIONS)
  @Max(PROJECT_EMBEDDING_DIMENSIONS)
  dimensions?: number;

  @ApiProperty({
    type: [Number],
    minItems: PROJECT_EMBEDDING_DIMENSIONS,
    maxItems: PROJECT_EMBEDDING_DIMENSIONS,
  })
  @IsArray()
  @ArrayMinSize(PROJECT_EMBEDDING_DIMENSIONS)
  @ArrayMaxSize(PROJECT_EMBEDDING_DIMENSIONS)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];
}

export class FindSimilarWorkItemsDto {
  @ApiProperty({
    type: [Number],
    minItems: PROJECT_EMBEDDING_DIMENSIONS,
    maxItems: PROJECT_EMBEDDING_DIMENSIONS,
  })
  @IsArray()
  @ArrayMinSize(PROJECT_EMBEDDING_DIMENSIONS)
  @ArrayMaxSize(PROJECT_EMBEDDING_DIMENSIONS)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class SimilarWorkItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: WORK_ITEM_STATUSES })
  status!: WorkItemStatus;

  @ApiProperty({ enum: WORK_ITEM_PRIORITIES })
  priority!: WorkItemPriority;

  @ApiProperty({
    description: 'Cosine similarity in [-1, 1]; higher is closer.',
  })
  similarity!: number;
}

export class WorkItemEmbeddingResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  embeddedTitle!: string;

  @ApiProperty()
  embeddedDescription!: string;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  dimensions!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  embeddedAt!: Date;
}
