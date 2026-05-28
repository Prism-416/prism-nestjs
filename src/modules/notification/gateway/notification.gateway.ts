import { Logger, UseFilters } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  WebSocketAuthService,
  WebSocketExceptionFilter,
} from '@/core/websocket';
import {
  NOTIFICATION_REALTIME_EVENTS,
  NOTIFICATION_REALTIME_NAMESPACE,
} from '@/modules/notification/constants';
import { NotificationCreatedPayloadDto } from '@/modules/notification/dto';
import { NotificationRealtimePublisherService } from '@/modules/notification/services';
import { buildNotificationUserRoom } from '@/modules/notification/utils';

const resolveSocketCorsOrigin = (): string[] | true => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

type NotificationServerToClientEvents = {
  [NOTIFICATION_REALTIME_EVENTS.NOTIFICATION_CREATED]: (
    payload: NotificationCreatedPayloadDto,
  ) => void;
};

type NotificationSocket = AuthenticatedSocket<
  Record<string, never>,
  NotificationServerToClientEvents
>;

@UseFilters(WebSocketExceptionFilter)
@WebSocketGateway({
  namespace: NOTIFICATION_REALTIME_NAMESPACE,
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
export class NotificationGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<NotificationSocket>,
    OnGatewayDisconnect<NotificationSocket>
{
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly webSocketAuthService: WebSocketAuthService,
    private readonly exceptionFilter: WebSocketExceptionFilter,
    private readonly realtimePublisher: NotificationRealtimePublisherService,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.bindServer(server);
  }

  async handleConnection(client: NotificationSocket): Promise<void> {
    try {
      const user = this.webSocketAuthService.authenticate(client);
      await client.join(buildNotificationUserRoom(String(user.sub)));
    } catch (error) {
      this.exceptionFilter.emitException(client, error, true);
    }
  }

  handleDisconnect(client: NotificationSocket): void {
    if (!client.data.user) {
      return;
    }

    this.logger.debug(
      `Notification socket disconnected user=${client.data.user.sub}`,
    );
  }
}
