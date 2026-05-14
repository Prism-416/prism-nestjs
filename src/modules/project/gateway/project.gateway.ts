import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { DomainError } from '@/core/errors';
import { JwtTokenService } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ProjectRealtimeUseCase } from '@/modules/project/usecases';

const PROJECT_NAMESPACE_PATTERN =
  /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PROJECT_JOINED_EVENT = 'project.joined';
const WEBSOCKET_EXCEPTION_EVENT = 'exception';

const resolveSocketCorsOrigin = (): string[] | true => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

type ProjectSocketData = {
  user?: JwtPayload;
  projectId?: string;
};

type ProjectSocket = Socket<
  Record<string, never>,
  {
    [PROJECT_JOINED_EVENT]: (payload: { projectId: string }) => void;
    [WEBSOCKET_EXCEPTION_EVENT]: (payload: {
      code: string;
      message: string;
    }) => void;
  },
  Record<string, never>,
  ProjectSocketData
>;

@WebSocketGateway({
  namespace: PROJECT_NAMESPACE_PATTERN,
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
    private readonly jwtTokenService: JwtTokenService,
    private readonly realtimeUseCase: ProjectRealtimeUseCase,
  ) {}

  async handleConnection(client: ProjectSocket): Promise<void> {
    try {
      const projectId = this.extractProjectId(client);
      const token = this.extractAccessToken(client);
      const user = this.jwtTokenService.verifyAccessToken(token);

      await this.realtimeUseCase.connectProjectClient(user.sub, projectId);

      client.data.user = user;
      client.data.projectId = projectId;
      await client.join(this.buildProjectRoom(projectId));
      client.emit(PROJECT_JOINED_EVENT, { projectId });
    } catch (error) {
      this.rejectClient(client, error);
    }
  }

  handleDisconnect(client: ProjectSocket): void {
    if (!client.data.projectId || !client.data.user) {
      return;
    }

    this.logger.debug(
      `Project socket disconnected user=${client.data.user.sub} project=${client.data.projectId}`,
    );
  }

  private extractProjectId(client: ProjectSocket): string {
    const match = client.nsp.name.match(PROJECT_NAMESPACE_PATTERN);
    if (!match?.[1]) {
      throw new UnauthorizedException('Invalid project websocket namespace');
    }

    return match[1];
  }

  private extractAccessToken(client: ProjectSocket): string {
    const auth = client.handshake.auth as { token?: unknown };
    const authToken = auth.token;
    if (typeof authToken === 'string') {
      return this.normalizeAccessToken(authToken);
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string') {
      return this.normalizeAccessToken(authorization);
    }

    throw new UnauthorizedException('Missing websocket access token');
  }

  private normalizeAccessToken(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new UnauthorizedException('Missing websocket access token');
    }

    const [scheme, token] = trimmed.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token;
    }

    return trimmed;
  }

  private buildProjectRoom(projectId: string): string {
    return `project:${projectId}`;
  }

  private rejectClient(client: ProjectSocket, error: unknown): void {
    const payload =
      error instanceof DomainError
        ? { code: error.code, message: error.message }
        : { code: 'WEBSOCKET_UNAUTHORIZED', message: 'Unauthorized.' };

    client.emit(WEBSOCKET_EXCEPTION_EVENT, payload);
    client.disconnect(true);
  }
}
