import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import {
  MAX_WORKSPACE_NAME_LENGTH,
  WORKSPACE_MEMBER_ROLES,
} from '@/modules/workspace/constants';
import {
  WORKSPACE_MEMBER_CANDIDATE_SEARCH_REASONS,
  type WorkspaceMemberCandidateSearchReason,
} from '@/modules/workspace/types';

const WORKSPACE_INVITATION_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'expired',
] as const;

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
  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  @IsString()
  @IsIn(WORKSPACE_MEMBER_ROLES)
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];
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

  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];

  @ApiProperty({ nullable: true })
  joinedAt!: Date | null;
}

export class WorkspaceSummaryResponseDto extends WorkspaceResponseDto {
  @ApiProperty()
  memberCount!: number;

  @ApiProperty()
  projectCount!: number;
}

export class SearchWorkspaceMemberCandidatesQueryDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(320)
  keyword!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class WorkspaceMemberCandidateResponseDto {
  @ApiProperty({ enum: ['existing', 'external'] })
  kind!: 'existing' | 'external';

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  fullName!: string | null;

  @ApiProperty({ nullable: true })
  username!: string | null;
}

export class WorkspaceMemberCandidateSearchResponseDto {
  @ApiProperty({ enum: WORKSPACE_MEMBER_CANDIDATE_SEARCH_REASONS })
  reason!: WorkspaceMemberCandidateSearchReason;

  @ApiProperty({ type: [WorkspaceMemberCandidateResponseDto] })
  items!: WorkspaceMemberCandidateResponseDto[];
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

  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  @IsString()
  @IsIn(WORKSPACE_MEMBER_ROLES)
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];
}

export class GetWorkspaceInvitationQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AcceptWorkspaceInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class DeclineWorkspaceInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class WorkspaceInvitationPreviewResponseDto {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  workspaceName!: string;

  @ApiProperty()
  workspaceSlug!: string;

  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ enum: WORKSPACE_INVITATION_STATUSES })
  status!: (typeof WORKSPACE_INVITATION_STATUSES)[number];
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

  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  token!: string;

  @ApiProperty()
  invitationLink!: string;
}
