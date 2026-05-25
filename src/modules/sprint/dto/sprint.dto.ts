import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SPRINT_STATUSES } from '@/modules/sprint/types';
import type { SprintStatus } from '@/modules/sprint/types';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/sprint/utils';

export class CreateSprintDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ enum: SPRINT_STATUSES, default: SPRINT_STATUSES[0] })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(SPRINT_STATUSES)
  status?: SprintStatus;
}

export class UpdateSprintMetadataDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ enum: SPRINT_STATUSES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(SPRINT_STATUSES)
  status?: SprintStatus;
}

export class SprintResponseDto {
  @ApiProperty()
  sprintId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  goal!: string | null;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty({ enum: SPRINT_STATUSES })
  status!: SprintStatus;

  @ApiProperty()
  createdAt!: Date;
}
