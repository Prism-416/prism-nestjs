import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { AGENT_REALTIME_EVENTS } from '@/modules/agent/constants';
import {
  AgentActionCreatedPayloadDto,
  AgentActionEventCreatedPayloadDto,
  AgentActionUpdatedPayloadDto,
  AgentRunCreatedPayloadDto,
  AgentRunUpdatedPayloadDto,
  AgentStepCreatedPayloadDto,
  AgentStepUpdatedPayloadDto,
} from '@/modules/agent/dto';
import { buildAgentWorkspaceRoom } from '@/modules/agent/utils';

@Injectable()
export class AgentRealtimePublisherService {
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  publishAgentRunCreated(payload: AgentRunCreatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_RUN_CREATED,
      payload,
    );
  }

  publishAgentRunUpdated(payload: AgentRunUpdatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_RUN_UPDATED,
      payload,
    );
  }

  publishAgentStepCreated(payload: AgentStepCreatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_STEP_CREATED,
      payload,
    );
  }

  publishAgentStepUpdated(payload: AgentStepUpdatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_STEP_UPDATED,
      payload,
    );
  }

  publishAgentActionCreated(payload: AgentActionCreatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_ACTION_CREATED,
      payload,
    );
  }

  publishAgentActionUpdated(payload: AgentActionUpdatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_ACTION_UPDATED,
      payload,
    );
  }

  publishAgentActionEventCreated(
    payload: AgentActionEventCreatedPayloadDto,
  ): void {
    this.emitToWorkspace(
      payload.workspaceId,
      AGENT_REALTIME_EVENTS.AGENT_ACTION_EVENT_CREATED,
      payload,
    );
  }

  private emitToWorkspace<TPayload>(
    workspaceId: string,
    event: string,
    payload: TPayload,
  ): void {
    this.server?.to(buildAgentWorkspaceRoom(workspaceId)).emit(event, payload);
  }
}
