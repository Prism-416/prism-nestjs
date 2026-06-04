import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SPRINT_STATUSES } from '@/modules/sprint/types';
import type { SprintStatus } from '@/modules/sprint/types';
import { normalizeOptionalTrimmedString } from '@/modules/sprint/utils';

export class CreateSprintDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

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
}

export class AddSprintWorkItemsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  itemIds!: string[];
}

export class CreateSprintForInternalDto extends CreateSprintDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class UpdateSprintMetadataForInternalDto extends UpdateSprintMetadataDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class AddSprintWorkItemsForInternalDto extends AddSprintWorkItemsDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
}

export class RemoveSprintWorkItemForInternalDto {
  @ApiProperty()
  @IsUUID('4')
  requestedByUserId!: string;
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
