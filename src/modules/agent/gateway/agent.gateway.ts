import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  WebSocketAuthService,
  WebSocketExceptionFilter,
} from '@/core/websocket';
import {
  AGENT_REALTIME_EVENTS,
  AGENT_REALTIME_NAMESPACE,
} from '@/modules/agent/constants';
import {
  AgentActionCreatedPayloadDto,
  AgentActionEventCreatedPayloadDto,
  AgentActionUpdatedPayloadDto,
  AgentRunCreatedPayloadDto,
  AgentRunUpdatedPayloadDto,
  AgentStepCreatedPayloadDto,
  AgentStepUpdatedPayloadDto,
  AgentWorkspaceJoinedPayloadDto,
  AgentWorkspaceLeftPayloadDto,
  JoinAgentWorkspaceDto,
  LeaveAgentWorkspaceDto,
} from '@/modules/agent/dto';
import { AgentRealtimePublisherService } from '@/modules/agent/services';
import { AgentRealtimeSubscriptionUseCase } from '@/modules/agent/usecases';
import { buildAgentWorkspaceRoom } from '@/modules/agent/utils';

const resolveSocketCorsOrigin = (): string[] | true => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

type AgentServerToClientEvents = {
  [AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_JOINED]: (
    payload: AgentWorkspaceJoinedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_LEFT]: (
    payload: AgentWorkspaceLeftPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_RUN_CREATED]: (
    payload: AgentRunCreatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_RUN_UPDATED]: (
    payload: AgentRunUpdatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_STEP_CREATED]: (
    payload: AgentStepCreatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_STEP_UPDATED]: (
    payload: AgentStepUpdatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_ACTION_CREATED]: (
    payload: AgentActionCreatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_ACTION_UPDATED]: (
    payload: AgentActionUpdatedPayloadDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_ACTION_EVENT_CREATED]: (
    payload: AgentActionEventCreatedPayloadDto,
  ) => void;
};

type AgentClientToServerEvents = {
  [AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_JOIN]: (
    payload: JoinAgentWorkspaceDto,
  ) => void;
  [AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_LEAVE]: (
    payload: LeaveAgentWorkspaceDto,
  ) => void;
};

type AgentSocket = AuthenticatedSocket<
  AgentClientToServerEvents,
  AgentServerToClientEvents
>;

@UseFilters(WebSocketExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidUnknownValues: true,
  }),
)
@WebSocketGateway({
  namespace: AGENT_REALTIME_NAMESPACE,
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
export class AgentGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<AgentSocket>,
    OnGatewayDisconnect<AgentSocket>
{
  private readonly logger = new Logger(AgentGateway.name);

  constructor(
    private readonly webSocketAuthService: WebSocketAuthService,
    private readonly exceptionFilter: WebSocketExceptionFilter,
    private readonly realtimePublisher: AgentRealtimePublisherService,
    private readonly subscriptionUseCase: AgentRealtimeSubscriptionUseCase,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.bindServer(server);
  }

  handleConnection(client: AgentSocket): void {
    try {
      this.webSocketAuthService.authenticate(client);
    } catch (error) {
      this.exceptionFilter.emitException(client, error, true);
    }
  }

  handleDisconnect(client: AgentSocket): void {
    if (!client.data.user) {
      return;
    }

    this.logger.debug(`Agent socket disconnected user=${client.data.user.sub}`);
  }

  @SubscribeMessage(AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_JOIN)
  async joinWorkspace(
    @ConnectedSocket() client: AgentSocket,
    @MessageBody() dto: JoinAgentWorkspaceDto,
  ): Promise<void> {
    const user = this.webSocketAuthService.getAuthenticatedUser(client);

    await this.subscriptionUseCase.joinWorkspace(user.sub, dto.workspaceId);
    await client.join(buildAgentWorkspaceRoom(dto.workspaceId));
    client.emit(AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_JOINED, {
      workspaceId: dto.workspaceId,
    });
  }

  @SubscribeMessage(AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_LEAVE)
  async leaveWorkspace(
    @ConnectedSocket() client: AgentSocket,
    @MessageBody() dto: LeaveAgentWorkspaceDto,
  ): Promise<void> {
    this.webSocketAuthService.getAuthenticatedUser(client);

    await client.leave(buildAgentWorkspaceRoom(dto.workspaceId));
    client.emit(AGENT_REALTIME_EVENTS.AGENT_WORKSPACE_LEFT, {
      workspaceId: dto.workspaceId,
    });
  }
}
