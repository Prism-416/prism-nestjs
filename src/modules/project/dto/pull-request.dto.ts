import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/project/utils';

const PULL_REQUEST_STATES = ['open', 'closed', 'merged'] as const;
const PULL_REQUEST_FILE_STATUSES = [
  'added',
  'modified',
  'removed',
  'renamed',
] as const;
const PULL_REQUEST_REVIEW_EVENTS = [
  'COMMENT',
  'APPROVE',
  'REQUEST_CHANGES',
] as const;
const PULL_REQUEST_REVIEW_COMMENT_SIDES = ['LEFT', 'RIGHT'] as const;

export class GetPullRequestForInternalQueryDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Include unified diff hunks in each returned file.',
  })
  @Transform(
    ({ value }) => value === undefined || value === true || value === 'true',
  )
  @IsOptional()
  @IsBoolean()
  includeDiff?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Include the pull request file list.',
  })
  @Transform(
    ({ value }) => value === undefined || value === true || value === 'true',
  )
  @IsOptional()
  @IsBoolean()
  includeFiles?: boolean;
}

export class PullRequestFileResponseDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty({ enum: PULL_REQUEST_FILE_STATUSES })
  status!: (typeof PULL_REQUEST_FILE_STATUSES)[number];

  @ApiProperty()
  additions!: number;

  @ApiProperty()
  deletions!: number;

  @ApiProperty({
    description:
      'Unified diff hunk for the file. Empty when includeDiff=false or the diff was truncated.',
  })
  patch!: string;
}

export class PullRequestCommitResponseDto {
  @ApiProperty()
  sha!: string;

  @ApiProperty()
  message!: string;
}

export class PullRequestForInternalResponseDto {
  @ApiProperty()
  pullNumber!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: PULL_REQUEST_STATES })
  state!: (typeof PULL_REQUEST_STATES)[number];

  @ApiProperty()
  headSha!: string;

  @ApiProperty()
  baseSha!: string;

  @ApiProperty()
  author!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: [PullRequestFileResponseDto] })
  files!: PullRequestFileResponseDto[];

  @ApiProperty({ type: [PullRequestCommitResponseDto] })
  commits!: PullRequestCommitResponseDto[];

  @ApiProperty({
    description:
      'True when file entries or patches were omitted due to size caps.',
  })
  truncated!: boolean;
}

export class CreatePullRequestReviewCommentForInternalDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  path!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  line!: number;

  @ApiPropertyOptional({
    enum: PULL_REQUEST_REVIEW_COMMENT_SIDES,
    default: 'RIGHT',
  })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(PULL_REQUEST_REVIEW_COMMENT_SIDES)
  side?: (typeof PULL_REQUEST_REVIEW_COMMENT_SIDES)[number];

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(65000)
  body!: string;
}

export class CreatePullRequestReviewForInternalDto {
  // Webhook-triggered reviews have no requester; only validated when present.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  requestedByUserId?: string | null;

  @ApiProperty({
    description:
      'Pull request head SHA the review was computed against. Stale values return 409.',
  })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  headSha!: string;

  @ApiProperty({ enum: PULL_REQUEST_REVIEW_EVENTS })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(PULL_REQUEST_REVIEW_EVENTS)
  event!: (typeof PULL_REQUEST_REVIEW_EVENTS)[number];

  @ApiProperty({ maxLength: 65000 })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(65000)
  summary!: string;

  @ApiPropertyOptional({
    type: [CreatePullRequestReviewCommentForInternalDto],
    description:
      'Optional line-anchored comments. Invalid path/line anchors return 422.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreatePullRequestReviewCommentForInternalDto)
  comments?: CreatePullRequestReviewCommentForInternalDto[];
}

export class CreatePullRequestReviewForInternalResponseDto {
  @ApiProperty()
  reviewId!: string;

  @ApiProperty()
  url!: string;
}
