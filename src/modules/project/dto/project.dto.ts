import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/project/utils';

export class CreateProjectDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
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
  timezone!: string;

  @ApiProperty()
  locale!: string;

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
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  locale?: string;
}

export class UpsertProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  jobIds!: string[];
}

export class UpsertProjectMembersDto {
  @ApiProperty({ type: [UpsertProjectMemberDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((member: UpsertProjectMemberDto) => member.userId)
  @ValidateNested({ each: true })
  @Type(() => UpsertProjectMemberDto)
  members!: UpsertProjectMemberDto[];
}

export class ProjectMemberResponseDto {
  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: [String] })
  jobIds!: string[];

  @ApiProperty()
  assignedAt!: Date;
}

export class ProjectMemberListResponseDto {
  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ type: [String] })
  jobNames!: string[];

  @ApiProperty()
  assignedAt!: Date;
}
