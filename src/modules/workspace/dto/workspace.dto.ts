import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsIn,
  IsArray,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/workspace/utils';
import { MAX_WORKSPACE_NAME_LENGTH } from '@/modules/workspace/constants';

export class CreateWorkspaceDto {
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(MAX_WORKSPACE_NAME_LENGTH)
  name!: string;

  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CreateProjectJobDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;
}

export class CreateProjectJobsDto {
  @ApiProperty({ type: [CreateProjectJobDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProjectJobDto)
  jobs!: CreateProjectJobDto[];
}

export class UpdateProjectJobDto {
  @ApiProperty()
  @IsUUID()
  jobId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;
}

export class UpdateProjectJobsDto {
  @ApiProperty({ type: [UpdateProjectJobDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((job: UpdateProjectJobDto) => job.jobId)
  @ValidateNested({ each: true })
  @Type(() => UpdateProjectJobDto)
  jobs!: UpdateProjectJobDto[];
}

export class UpdateWorkspaceDto {
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(MAX_WORKSPACE_NAME_LENGTH)
  name?: string;

  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role!: 'admin' | 'member' | 'viewer';
}

export class TransferWorkspaceOwnerDto {
  @ApiProperty()
  @IsUUID()
  ownerId!: string;
}

export class WorkspaceResponseDto {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class WorkspaceMemberResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role!: 'admin' | 'member' | 'viewer';

  @ApiProperty({ nullable: true })
  joinedAt!: Date | null;

  @ApiProperty({ nullable: true })
  invitedAt!: Date | null;
}

export class ProjectJobResponseDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class CreateWorkspaceInvitationDto {
  @ApiProperty()
  @IsUUID()
  receiverId!: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role!: 'admin' | 'member' | 'viewer';
}

export class AcceptWorkspaceInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class WorkspaceInvitationResponseDto {
  @ApiProperty()
  invitationId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  receiverId!: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role!: 'admin' | 'member' | 'viewer';

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  token!: string;

  @ApiProperty()
  invitationLink!: string;
}
