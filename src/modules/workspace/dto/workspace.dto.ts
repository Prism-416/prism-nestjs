import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsEmail,
  IsIn,
  IsArray,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  normalizeNullableTrimmedString,
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/workspace/utils';
import {
  MAX_WORKSPACE_NAME_LENGTH,
  WORKSPACE_ASSIGNABLE_MEMBER_ROLES,
  WORKSPACE_INVITATION_STATUSES,
  WORKSPACE_MEMBER_ROLES,
} from '@/modules/workspace/constants';
import {
  FEATURE_PROVISIONING_REQUEST_STATUSES,
  WORKSPACE_MEMBER_CANDIDATE_SEARCH_REASONS,
  type FeatureProvisioningRequestStatus,
  type WorkspaceMemberCandidateSearchReason,
} from '@/modules/workspace/types';

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

export class CreateWorkspaceJobDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => normalizeNullableTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class CreateWorkspaceJobsDto {
  @ApiProperty({ type: [CreateWorkspaceJobDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkspaceJobDto)
  jobs!: CreateWorkspaceJobDto[];
}

export class UpdateWorkspaceJobDto {
  @ApiProperty()
  @IsUUID()
  jobId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => normalizeNullableTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateWorkspaceJobsDto {
  @ApiProperty({ type: [UpdateWorkspaceJobDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((job: UpdateWorkspaceJobDto) => job.jobId)
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkspaceJobDto)
  jobs!: UpdateWorkspaceJobDto[];
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
  @ApiProperty({ enum: WORKSPACE_ASSIGNABLE_MEMBER_ROLES })
  @IsString()
  @IsIn(WORKSPACE_ASSIGNABLE_MEMBER_ROLES)
  role!: (typeof WORKSPACE_ASSIGNABLE_MEMBER_ROLES)[number];
}

export class UpdateWorkspaceMemberJobsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  jobIds!: string[];
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

  @ApiProperty({ type: [String] })
  jobIds!: string[];

  @ApiProperty({ type: [String] })
  jobNames!: string[];

  @ApiProperty({ nullable: true })
  joinedAt!: Date | null;
}

export class WorkspaceMemberWorkloadResponseDto extends WorkspaceMemberResponseDto {
  @ApiProperty()
  assignedItemCount!: number;

  @ApiProperty()
  activeItemCount!: number;

  @ApiProperty()
  todoItemCount!: number;

  @ApiProperty()
  inProgressItemCount!: number;

  @ApiProperty()
  inReviewItemCount!: number;

  @ApiProperty()
  doneItemCount!: number;

  @ApiProperty()
  archivedItemCount!: number;

  @ApiProperty()
  overdueItemCount!: number;

  @ApiProperty()
  dueTodayItemCount!: number;

  @ApiProperty()
  dueThisWeekItemCount!: number;
}

export class WorkspaceSummaryResponseDto extends WorkspaceResponseDto {
  @ApiProperty()
  memberCount!: number;

  @ApiProperty()
  projectCount!: number;
}

export class CreateWorkspaceRepositoryLinkDto {
  @ApiProperty()
  @Matches(/^\d+$/)
  githubInstallationId!: string;

  @ApiProperty()
  @Matches(/^\d+$/)
  githubRepositoryId!: string;
}

export class WorkspaceRepositoryLinkResponseDto {
  @ApiProperty()
  linkId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  githubInstallationId!: string;

  @ApiProperty()
  githubRepositoryId!: string;

  @ApiProperty()
  repositoryOwner!: string;

  @ApiProperty()
  repositoryName!: string;

  @ApiProperty()
  repositoryFullName!: string;

  @ApiProperty()
  repositoryUrl!: string;

  @ApiProperty({ nullable: true })
  defaultBranch!: string | null;

  @ApiProperty({ enum: ['public', 'private', 'internal'], nullable: true })
  visibility!: 'public' | 'private' | 'internal' | null;

  @ApiProperty({ nullable: true })
  connectedByUserId!: string | null;

  @ApiProperty()
  connectedAt!: Date;
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

export class WorkspaceJobResponseDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CreateWorkspaceInvitationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  receiverId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiProperty({ enum: WORKSPACE_ASSIGNABLE_MEMBER_ROLES })
  @IsString()
  @IsIn(WORKSPACE_ASSIGNABLE_MEMBER_ROLES)
  role!: (typeof WORKSPACE_ASSIGNABLE_MEMBER_ROLES)[number];
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

  @ApiProperty()
  requiresSignup!: boolean;
}

export class WorkspaceInvitationResponseDto {
  @ApiProperty()
  invitationId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty({ nullable: true })
  receiverId!: string | null;

  @ApiProperty()
  receiverEmail!: string;

  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLES })
  role!: (typeof WORKSPACE_MEMBER_ROLES)[number];

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  token!: string;

  @ApiProperty()
  invitationLink!: string;
}

export class CreateFeatureProvisioningRequestDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ maxLength: 20000 })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  featureSpecification!: string;
}

export class FeatureProvisioningRequestResponseDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  requestedByUserId!: string | null;

  @ApiProperty({ enum: FEATURE_PROVISIONING_REQUEST_STATUSES })
  status!: FeatureProvisioningRequestStatus;

  @ApiProperty()
  payloadObjectName!: string;

  @ApiProperty({ nullable: true })
  payloadVersionId!: string | null;

  @ApiProperty({ nullable: true })
  queueMessageId!: string | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ nullable: true })
  dispatchedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
