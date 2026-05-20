import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalUseCase } from '@/modules/internal/usecases';
import type { InternalAuthenticatedRequest } from '@/modules/internal/types';

@Injectable()
export class InternalAuthenticationGuard implements CanActivate {
  constructor(private readonly usecase: InternalUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & InternalAuthenticatedRequest>();
    const token = this.extractToken(request);

    request.internalService = await this.usecase.validateServiceApiToken(token);
    return true;
  }

  private extractToken(request: Request): string {
    const internalToken = request.headers['x-internal-api-token'];
    if (Array.isArray(internalToken)) {
      throw new UnauthorizedException('Invalid internal token header format');
    }

    if (typeof internalToken === 'string' && internalToken.trim()) {
      return internalToken.trim();
    }

    return this.extractBearerToken(request.headers.authorization);
  }

  private extractBearerToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('Missing internal token');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    return token;
  }
}
