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
  WORKSPACE_REALTIME_EVENTS,
  WORKSPACE_REALTIME_NAMESPACE,
} from '@/modules/workspace/constants';
import {
  JoinWorkspaceDto,
  LeaveWorkspaceDto,
  ProjectCreatedWorkspacePayloadDto,
  ProjectDeletedWorkspacePayloadDto,
  ProjectUpdatedWorkspacePayloadDto,
  SprintCreatedPayloadDto,
  SprintDeletedPayloadDto,
  SprintUpdatedPayloadDto,
  SprintWorkItemsChangedPayloadDto,
  WorkspaceDeletedPayloadDto,
  WorkspaceJobDeletedPayloadDto,
  WorkspaceJobsChangedPayloadDto,
  WorkspaceJoinedPayloadDto,
  WorkspaceLeftPayloadDto,
  WorkspaceMemberCreatedPayloadDto,
  WorkspaceMemberRemovedPayloadDto,
  WorkspaceMemberUpdatedPayloadDto,
  WorkspaceUpdatedPayloadDto,
} from '@/modules/workspace/dto';
import { WorkspaceRealtimePublisherService } from '@/modules/workspace/services';
import { WorkspaceRealtimeSubscriptionUseCase } from '@/modules/workspace/usecases';
import { buildWorkspaceRoom } from '@/modules/workspace/utils';

const resolveSocketCorsOrigin = (): string[] | true => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

type WorkspaceServerToClientEvents = {
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOINED]: (
    payload: WorkspaceJoinedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_LEFT]: (
    payload: WorkspaceLeftPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_UPDATED]: (
    payload: WorkspaceUpdatedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_DELETED]: (
    payload: WorkspaceDeletedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.PROJECT_CREATED]: (
    payload: ProjectCreatedWorkspacePayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.PROJECT_UPDATED]: (
    payload: ProjectUpdatedWorkspacePayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.PROJECT_DELETED]: (
    payload: ProjectDeletedWorkspacePayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.SPRINT_CREATED]: (
    payload: SprintCreatedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.SPRINT_UPDATED]: (
    payload: SprintUpdatedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.SPRINT_DELETED]: (
    payload: SprintDeletedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.SPRINT_WORK_ITEMS_CHANGED]: (
    payload: SprintWorkItemsChangedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_CREATED]: (
    payload: WorkspaceMemberCreatedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_UPDATED]: (
    payload: WorkspaceMemberUpdatedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_REMOVED]: (
    payload: WorkspaceMemberRemovedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOBS_CHANGED]: (
    payload: WorkspaceJobsChangedPayloadDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOB_DELETED]: (
    payload: WorkspaceJobDeletedPayloadDto,
  ) => void;
};

type WorkspaceClientToServerEvents = {
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOIN]: (
    payload: JoinWorkspaceDto,
  ) => void;
  [WORKSPACE_REALTIME_EVENTS.WORKSPACE_LEAVE]: (
    payload: LeaveWorkspaceDto,
  ) => void;
};

type WorkspaceSocket = AuthenticatedSocket<
  WorkspaceClientToServerEvents,
  WorkspaceServerToClientEvents
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
  namespace: WORKSPACE_REALTIME_NAMESPACE,
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
export class WorkspaceGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<WorkspaceSocket>,
    OnGatewayDisconnect<WorkspaceSocket>
{
  private readonly logger = new Logger(WorkspaceGateway.name);

  constructor(
    private readonly webSocketAuthService: WebSocketAuthService,
    private readonly exceptionFilter: WebSocketExceptionFilter,
    private readonly realtimePublisher: WorkspaceRealtimePublisherService,
    private readonly subscriptionUseCase: WorkspaceRealtimeSubscriptionUseCase,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.bindServer(server);
  }

  handleConnection(client: WorkspaceSocket): void {
    try {
      this.webSocketAuthService.authenticate(client);
    } catch (error) {
      this.exceptionFilter.emitException(client, error, true);
    }
  }

  handleDisconnect(client: WorkspaceSocket): void {
    if (!client.data.user) {
      return;
    }

    this.logger.debug(
      `Workspace socket disconnected user=${client.data.user.sub}`,
    );
  }

  @SubscribeMessage(WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOIN)
  async joinWorkspace(
    @ConnectedSocket() client: WorkspaceSocket,
    @MessageBody() dto: JoinWorkspaceDto,
  ): Promise<void> {
    const user = this.webSocketAuthService.getAuthenticatedUser(client);

    await this.subscriptionUseCase.joinWorkspace(user.sub, dto.workspaceId);
    await client.join(buildWorkspaceRoom(dto.workspaceId));
    client.emit(WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOINED, {
      workspaceId: dto.workspaceId,
    });
  }

  @SubscribeMessage(WORKSPACE_REALTIME_EVENTS.WORKSPACE_LEAVE)
  async leaveWorkspace(
    @ConnectedSocket() client: WorkspaceSocket,
    @MessageBody() dto: LeaveWorkspaceDto,
  ): Promise<void> {
    this.webSocketAuthService.getAuthenticatedUser(client);

    await client.leave(buildWorkspaceRoom(dto.workspaceId));
    client.emit(WORKSPACE_REALTIME_EVENTS.WORKSPACE_LEFT, {
      workspaceId: dto.workspaceId,
    });
  }
}
