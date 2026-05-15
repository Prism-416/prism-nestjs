import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  AuthenticatedSocket,
  WebSocketAuthService,
  WebSocketExceptionFilter,
} from '@/core/websocket';
import {
  PROJECT_REALTIME_EVENTS,
  PROJECT_REALTIME_NAMESPACE,
} from '@/modules/project/constants';
import { JoinProjectDto, ProjectJoinedPayloadDto } from '@/modules/project/dto';
import { ProjectRealtimeUseCase } from '@/modules/project/usecases';
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
};

type ProjectClientToServerEvents = {
  [PROJECT_REALTIME_EVENTS.PROJECT_JOIN]: (payload: JoinProjectDto) => void;
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
    OnGatewayConnection<ProjectSocket>,
    OnGatewayDisconnect<ProjectSocket>
{
  private readonly logger = new Logger(ProjectGateway.name);

  constructor(
    private readonly webSocketAuthService: WebSocketAuthService,
    private readonly exceptionFilter: WebSocketExceptionFilter,
    private readonly realtimeUseCase: ProjectRealtimeUseCase,
  ) {}

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

    await this.realtimeUseCase.joinProject(user.sub, dto.projectId);
    await client.join(buildProjectRoom(dto.projectId));
    client.emit(PROJECT_REALTIME_EVENTS.PROJECT_JOINED, {
      projectId: dto.projectId,
    });
  }
}
