import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
  PROJECT_REALTIME_EVENTS,
  PROJECT_REALTIME_NAMESPACE,
} from '@/modules/project/constants';
import {
  CommentCreatedPayloadDto,
  CommentDeletedPayloadDto,
  CommentUpdatedPayloadDto,
  JoinProjectDto,
  LeaveProjectDto,
  ProjectDeletedPayloadDto,
  ProjectJoinedPayloadDto,
  ProjectLeftPayloadDto,
  ProjectUpdatedPayloadDto,
  WorkItemCreatedPayloadDto,
  WorkItemDeletedPayloadDto,
  WorkItemUpdatedPayloadDto,
} from '@/modules/project/dto';
import { ProjectRealtimePublisherService } from '@/modules/project/services';
import { ProjectRealtimeSubscriptionUseCase } from '@/modules/project/usecases';
import { buildProjectRoom } from '@/modules/project/utils';

const resolveSocketCorsOrigin = (): string[] | true => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

type ProjectServerToClientEvents = {
  [PROJECT_REALTIME_EVENTS.PROJECT_JOINED]: (
    payload: ProjectJoinedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.PROJECT_LEFT]: (
    payload: ProjectLeftPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.PROJECT_UPDATED]: (
    payload: ProjectUpdatedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.PROJECT_DELETED]: (
    payload: ProjectDeletedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.WORK_ITEM_CREATED]: (
    payload: WorkItemCreatedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.WORK_ITEM_UPDATED]: (
    payload: WorkItemUpdatedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.WORK_ITEM_DELETED]: (
    payload: WorkItemDeletedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.COMMENT_CREATED]: (
    payload: CommentCreatedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.COMMENT_UPDATED]: (
    payload: CommentUpdatedPayloadDto,
  ) => void;
  [PROJECT_REALTIME_EVENTS.COMMENT_DELETED]: (
    payload: CommentDeletedPayloadDto,
  ) => void;
};

type ProjectClientToServerEvents = {
  [PROJECT_REALTIME_EVENTS.PROJECT_JOIN]: (payload: JoinProjectDto) => void;
  [PROJECT_REALTIME_EVENTS.PROJECT_LEAVE]: (payload: LeaveProjectDto) => void;
};

type ProjectSocket = AuthenticatedSocket<
  ProjectClientToServerEvents,
  ProjectServerToClientEvents
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
  namespace: PROJECT_REALTIME_NAMESPACE,
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
export class ProjectGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<ProjectSocket>,
    OnGatewayDisconnect<ProjectSocket>
{
  private readonly logger = new Logger(ProjectGateway.name);

  constructor(
    private readonly webSocketAuthService: WebSocketAuthService,
    private readonly exceptionFilter: WebSocketExceptionFilter,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
    private readonly subscriptionUseCase: ProjectRealtimeSubscriptionUseCase,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.bindServer(server);
  }

  handleConnection(client: ProjectSocket): void {
    try {
      this.webSocketAuthService.authenticate(client);
    } catch (error) {
      this.exceptionFilter.emitException(client, error, true);
    }
  }

  handleDisconnect(client: ProjectSocket): void {
    if (!client.data.user) {
      return;
    }

    this.logger.debug(
      `Project socket disconnected user=${client.data.user.sub}`,
    );
  }

  @SubscribeMessage(PROJECT_REALTIME_EVENTS.PROJECT_JOIN)
  async joinProject(
    @ConnectedSocket() client: ProjectSocket,
    @MessageBody() dto: JoinProjectDto,
  ): Promise<void> {
    const user = this.webSocketAuthService.getAuthenticatedUser(client);

    await this.subscriptionUseCase.joinProject(user.sub, dto.projectId);
    await client.join(buildProjectRoom(dto.projectId));
    client.emit(PROJECT_REALTIME_EVENTS.PROJECT_JOINED, {
      projectId: dto.projectId,
    });
  }

  @SubscribeMessage(PROJECT_REALTIME_EVENTS.PROJECT_LEAVE)
  async leaveProject(
    @ConnectedSocket() client: ProjectSocket,
    @MessageBody() dto: LeaveProjectDto,
  ): Promise<void> {
    this.webSocketAuthService.getAuthenticatedUser(client);

    await client.leave(buildProjectRoom(dto.projectId));
    client.emit(PROJECT_REALTIME_EVENTS.PROJECT_LEFT, {
      projectId: dto.projectId,
    });
  }
}
