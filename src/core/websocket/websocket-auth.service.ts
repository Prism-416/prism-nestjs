import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, JwtTokenService } from '@/core/auth';
import type { AuthenticatedSocket } from '@/core/websocket/websocket.types';

@Injectable()
export class WebSocketAuthService {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  authenticate(client: AuthenticatedSocket): JwtPayload {
    const token = this.extractAccessToken(client);
    const user = this.jwtTokenService.verifyAccessToken(token);

    client.data.user = user;
    return user;
  }

  getAuthenticatedUser(client: AuthenticatedSocket): JwtPayload {
    if (!client.data.user) {
      throw new UnauthorizedException('Missing websocket user');
    }

    return client.data.user;
  }

  private extractAccessToken(client: AuthenticatedSocket): string {
    const auth = client.handshake.auth as { token?: unknown };
    if (typeof auth.token === 'string') {
      return this.normalizeAccessToken(auth.token);
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
}
