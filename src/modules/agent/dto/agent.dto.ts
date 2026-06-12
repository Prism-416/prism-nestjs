import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AGENT_ACTION_STATUSES,
  AGENT_EMBEDDING_DIMENSIONS,
  AGENT_MEMORY_TYPES,
  AGENT_RUN_STATUSES,
  AGENT_RUN_TRIGGER_TYPES,
  AGENT_STEP_STATUSES,
} from '@/modules/agent/types';
import type {
  AgentActionStatus,
  AgentMemoryType,
  AgentRunStatus,
  AgentRunTriggerType,
  AgentStepStatus,
} from '@/modules/agent/types';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/agent/utils';

export class CreateAgentRunDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  agentType!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  objective!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  workItemId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  parentRunId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  systemPromptVersion?: string;
}

export class CreateAgentRunForInternalDto extends CreateAgentRunDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  runId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  triggeredByUserId?: string;

  @ApiProperty({ enum: AGENT_RUN_TRIGGER_TYPES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(AGENT_RUN_TRIGGER_TYPES)
  triggerType!: AgentRunTriggerType;

  @ApiPropertyOptional({ enum: AGENT_RUN_STATUSES, default: 'queued' })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(AGENT_RUN_STATUSES)
  status?: AgentRunStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

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

export class UpdateAgentRunStatusForInternalDto {
  @ApiProperty({ enum: AGENT_RUN_STATUSES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(AGENT_RUN_STATUSES)
  status!: AgentRunStatus;
}

export class UpsertAgentStepForInternalDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  stepId?: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stepOrder!: number;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  stepType!: string;

  @ApiProperty({ enum: AGENT_STEP_STATUSES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(AGENT_STEP_STATUSES)
  status!: AgentStepStatus;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  inputObjectName?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  outputObjectName?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  inputSummary?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  outputSummary?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  errorMessage?: string;
}

export class UpsertAgentActionForInternalDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  actionId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  stepId?: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  actionType!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  targetType!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiProperty({ enum: AGENT_ACTION_STATUSES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(AGENT_ACTION_STATUSES)
  status!: AgentActionStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reasoningSummary?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  payloadObjectName?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resultObjectName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  approvedByUserId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  executedAt?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  errorMessage?: string;
}

export class CreateAgentActionEventForInternalDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  eventType!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  eventObjectName?: string;
}

export class AgentRunResponseDto {
  @ApiProperty()
  runId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true })
  triggeredByUserId!: string | null;

  @ApiProperty({ nullable: true })
  workItemId!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      "Readable code of the linked work item (e.g. 'PRSM-001'), snapshotted at run creation. Null when the run has no linked work item.",
  })
  workItemCode!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Title of the linked work item, snapshotted at run creation. Null when the run has no linked work item.',
  })
  workItemTitle!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Project the linked work item belonged to at run creation, used to deep-link to the work item. Null when the run has no linked work item.',
  })
  projectId!: string | null;

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

export class AgentStepResponseDto {
  @ApiProperty()
  stepId!: string;

  @ApiProperty()
  runId!: string;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  stepType!: string;

  @ApiProperty({ enum: AGENT_STEP_STATUSES })
  status!: AgentStepStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  inputObjectName!: string | null;

  @ApiProperty({ nullable: true })
  outputObjectName!: string | null;

  @ApiProperty({ nullable: true })
  inputSummary!: string | null;

  @ApiProperty({ nullable: true })
  outputSummary!: string | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AgentActionResponseDto {
  @ApiProperty()
  actionId!: string;

  @ApiProperty()
  runId!: string;

  @ApiProperty({ nullable: true })
  stepId!: string | null;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  actionType!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty({ nullable: true })
  targetId!: string | null;

  @ApiProperty({ enum: AGENT_ACTION_STATUSES })
  status!: AgentActionStatus;

  @ApiProperty({ nullable: true })
  reasoningSummary!: string | null;

  @ApiProperty({ nullable: true })
  payloadObjectName!: string | null;

  @ApiProperty({ nullable: true })
  resultObjectName!: string | null;

  @ApiProperty()
  requiresApproval!: boolean;

  @ApiProperty({ nullable: true })
  approvedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  approvedAt!: Date | null;

  @ApiProperty({ nullable: true })
  executedAt!: Date | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AgentActionEventResponseDto {
  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  actionId!: string;

  @ApiProperty({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ nullable: true })
  message!: string | null;

  @ApiProperty({ nullable: true })
  eventObjectName!: string | null;

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

export class UpsertAgentMemoryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  memoryId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  runId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  stepId?: string;

  @ApiProperty({ enum: AGENT_MEMORY_TYPES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsIn(AGENT_MEMORY_TYPES)
  memoryType!: AgentMemoryType;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;
}

export class AgentMemoryResponseDto {
  @ApiProperty()
  memoryId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true })
  runId!: string | null;

  @ApiProperty({ nullable: true })
  stepId!: string | null;

  @ApiProperty({ enum: AGENT_MEMORY_TYPES })
  memoryType!: AgentMemoryType;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class AgentRunStateResponseDto {
  @ApiProperty({ type: AgentRunResponseDto })
  run!: AgentRunResponseDto;

  @ApiProperty({ type: [AgentStepResponseDto] })
  steps!: AgentStepResponseDto[];

  @ApiProperty({ type: [AgentActionResponseDto] })
  actions!: AgentActionResponseDto[];

  @ApiProperty({ type: [AgentActionEventResponseDto] })
  actionEvents!: AgentActionEventResponseDto[];

  @ApiProperty({ type: [AgentMemoryResponseDto] })
  memories!: AgentMemoryResponseDto[];
}

export class UpsertAgentMemoryEmbeddingDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiPropertyOptional({
    default: AGENT_EMBEDDING_DIMENSIONS,
    minimum: AGENT_EMBEDDING_DIMENSIONS,
    maximum: AGENT_EMBEDDING_DIMENSIONS,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(AGENT_EMBEDDING_DIMENSIONS)
  @Max(AGENT_EMBEDDING_DIMENSIONS)
  dimensions?: number;

  @ApiProperty({
    type: [Number],
    minItems: AGENT_EMBEDDING_DIMENSIONS,
    maxItems: AGENT_EMBEDDING_DIMENSIONS,
  })
  @IsArray()
  @ArrayMinSize(AGENT_EMBEDDING_DIMENSIONS)
  @ArrayMaxSize(AGENT_EMBEDDING_DIMENSIONS)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];
}

export class AgentMemoryEmbeddingResponseDto {
  @ApiProperty()
  memoryId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  dimensions!: number;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  embeddedAt!: Date;
}

export class AgentWorkflowDispatchResponseDto {
  @ApiProperty()
  runId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  queueMessageId!: string;
}
