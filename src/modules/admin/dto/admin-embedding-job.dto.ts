import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetEmbeddingJobHealthQueryDto {
  @ApiPropertyOptional({ default: 60, minimum: 1, maximum: 10080 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  staleQueuedAfterMinutes?: number;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 1440 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  staleRunningAfterMinutes?: number;
}

export class EmbeddingJobHealthSummaryResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  staleQueuedAfterMinutes!: number;

  @ApiProperty()
  staleRunningAfterMinutes!: number;

  @ApiProperty()
  totalJobs!: number;

  @ApiProperty()
  queuedJobs!: number;

  @ApiProperty()
  claimableQueuedJobs!: number;

  @ApiProperty()
  scheduledQueuedJobs!: number;

  @ApiProperty()
  staleQueuedJobs!: number;

  @ApiProperty()
  exhaustedQueuedJobs!: number;

  @ApiProperty()
  runningJobs!: number;

  @ApiProperty()
  staleRunningJobs!: number;

  @ApiProperty()
  completedJobs!: number;

  @ApiProperty()
  failedJobs!: number;

  @ApiProperty()
  cancelledJobs!: number;

  @ApiProperty()
  projectsWithPendingJobs!: number;
}
