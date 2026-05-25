import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/project/utils';
import { MAX_WORKSPACE_SLUG_LENGTH } from '@/modules/workspace/constants';

export class CreateProjectDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_WORKSPACE_SLUG_LENGTH)
  workspaceSlug!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class GetProjectsQueryDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;
}

export class ProjectResponseDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ProjectSummaryResponseDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
