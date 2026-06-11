import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetUserSignupTrendQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;
}

export class GetUserActiveTrendQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;
}

export class UserMetricsSummaryResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  verifiedUsers!: number;

  @ApiProperty()
  unverifiedUsers!: number;

  @ApiProperty()
  usersWithEmailAuth!: number;

  @ApiProperty()
  usersWithGoogleAuth!: number;

  @ApiProperty()
  usersWithGithubAuth!: number;

  @ApiProperty()
  usersWithOauthAuth!: number;

  @ApiProperty()
  usersWithActiveSession!: number;

  @ApiProperty()
  usersInWorkspace!: number;

  @ApiProperty()
  usersWithoutWorkspace!: number;

  @ApiProperty()
  newUsersLast24h!: number;

  @ApiProperty()
  newUsersLast7d!: number;

  @ApiProperty()
  newUsersLast30d!: number;
}

export class UserSignupBucketResponseDto {
  @ApiProperty({ example: '2026-06-11' })
  date!: string;

  @ApiProperty()
  count!: number;
}

export class UserSignupTrendResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  windowDays!: number;

  @ApiProperty()
  totalSignups!: number;

  @ApiProperty({ type: [UserSignupBucketResponseDto] })
  buckets!: UserSignupBucketResponseDto[];
}

export class UserActivitySummaryResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ description: 'Distinct active users in the last 24 hours' })
  dau!: number;

  @ApiProperty({ description: 'Distinct active users in the last 7 days' })
  wau!: number;

  @ApiProperty({ description: 'Distinct active users in the last 30 days' })
  mau!: number;

  @ApiProperty({
    nullable: true,
    description: 'DAU / MAU ratio, rounded to 4 decimals; null when MAU is 0',
  })
  stickiness!: number | null;
}

export class UserActiveBucketResponseDto {
  @ApiProperty({ example: '2026-06-11' })
  date!: string;

  @ApiProperty({ description: 'Distinct users active that day' })
  activeUsers!: number;

  @ApiProperty({ description: 'Active users who signed up that day' })
  newUsers!: number;

  @ApiProperty({ description: 'Active users who signed up before that day' })
  returningUsers!: number;
}

export class UserActiveTrendResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  windowDays!: number;

  @ApiProperty({ type: [UserActiveBucketResponseDto] })
  buckets!: UserActiveBucketResponseDto[];
}
