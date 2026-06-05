import { IsUUID } from 'class-validator';
import {
  AgentActionEventResponseDto,
  AgentActionResponseDto,
  AgentRunResponseDto,
  AgentStepResponseDto,
} from '@/modules/agent/dto/agent.dto';

export class JoinAgentWorkspaceDto {
  @IsUUID()
  workspaceId!: string;
}

export class LeaveAgentWorkspaceDto {
  @IsUUID()
  workspaceId!: string;
}

export class AgentWorkspaceJoinedPayloadDto {
  workspaceId!: string;
}

export class AgentWorkspaceLeftPayloadDto {
  workspaceId!: string;
}

export class AgentRunCreatedPayloadDto extends AgentRunResponseDto {}

export class AgentRunUpdatedPayloadDto extends AgentRunResponseDto {}

export class AgentStepCreatedPayloadDto extends AgentStepResponseDto {
  workspaceId!: string;
}

export class AgentStepUpdatedPayloadDto extends AgentStepResponseDto {
  workspaceId!: string;
}

export class AgentActionCreatedPayloadDto extends AgentActionResponseDto {}

export class AgentActionUpdatedPayloadDto extends AgentActionResponseDto {}

export class AgentActionEventCreatedPayloadDto extends AgentActionEventResponseDto {
  workspaceId!: string;
}
