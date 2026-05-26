import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EMBEDDING_JOB_DIMENSIONS,
  EMBEDDING_JOB_REPORT_STATUSES,
  EMBEDDING_JOB_STATUSES,
  EMBEDDING_JOB_TYPES,
} from '@/modules/embedding/types';
import type {
  EmbeddingJobReportStatus,
  EmbeddingJobStatus,
  EmbeddingJobType,
} from '@/modules/embedding/types';

function normalizeTrimmedString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function normalizeOptionalTrimmedString(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalTrimmedStringArray(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => normalizeOptionalTrimmedString(item));
}

export class CreateEmbeddingJobDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ enum: EMBEDDING_JOB_TYPES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(EMBEDDING_JOB_TYPES)
  jobType!: EmbeddingJobType;

  @ApiProperty()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsUUID()
  targetId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiPropertyOptional({
    default: EMBEDDING_JOB_DIMENSIONS,
    minimum: EMBEDDING_JOB_DIMENSIONS,
    maximum: EMBEDDING_JOB_DIMENSIONS,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(EMBEDDING_JOB_DIMENSIONS)
  @Max(EMBEDDING_JOB_DIMENSIONS)
  dimensions?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(256)
  contentHash?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  objectName?: string;

  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ClaimEmbeddingJobsDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: EMBEDDING_JOB_TYPES, isArray: true })
  @Transform(({ value }) => normalizeOptionalTrimmedStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(EMBEDDING_JOB_TYPES, { each: true })
  jobTypes?: EmbeddingJobType[];

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateEmbeddingJobDto {
  @ApiProperty({ enum: EMBEDDING_JOB_REPORT_STATUSES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(EMBEDDING_JOB_REPORT_STATUSES)
  status!: EmbeddingJobReportStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Used when status is queued.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class EmbeddingJobResponseDto {
  @ApiProperty()
  embeddingJobId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true })
  projectId!: string | null;

  @ApiProperty({ enum: EMBEDDING_JOB_TYPES })
  jobType!: EmbeddingJobType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: EMBEDDING_JOB_STATUSES })
  status!: EmbeddingJobStatus;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  dimensions!: number;

  @ApiProperty({ nullable: true })
  contentHash!: string | null;

  @ApiProperty({ nullable: true })
  objectName!: string | null;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty({ nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ClaimEmbeddingJobsResponseDto {
  @ApiProperty({ type: [EmbeddingJobResponseDto] })
  items!: EmbeddingJobResponseDto[];

  @ApiProperty()
  count!: number;
}
