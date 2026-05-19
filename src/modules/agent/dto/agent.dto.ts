import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AGENT_RUN_STATUSES,
  AGENT_RUN_TRIGGER_TYPES,
} from '@/modules/agent/types';
import type {
  AgentRunStatus,
  AgentRunTriggerType,
} from '@/modules/agent/types';
import { normalizeOptionalTrimmedString } from '@/modules/agent/utils';

export class SearchAgentRunsQueryDto {
  @ApiPropertyOptional({ enum: AGENT_RUN_STATUSES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(AGENT_RUN_STATUSES)
  status?: AgentRunStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  agentType?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  workItemId?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AgentRunResponseDto {
  @ApiProperty()
  runId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  triggeredByUserId!: string | null;

  @ApiProperty({ nullable: true })
  workItemId!: string | null;

  @ApiProperty({ nullable: true })
  parentRunId!: string | null;

  @ApiProperty()
  agentType!: string;

  @ApiProperty({ enum: AGENT_RUN_TRIGGER_TYPES })
  triggerType!: AgentRunTriggerType;

  @ApiProperty({ enum: AGENT_RUN_STATUSES })
  status!: AgentRunStatus;

  @ApiProperty()
  objective!: string;

  @ApiProperty({ nullable: true })
  systemPromptVersion!: string | null;

  @ApiProperty({ nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SearchAgentRunsResponseDto {
  @ApiProperty({ type: [AgentRunResponseDto] })
  items!: AgentRunResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
