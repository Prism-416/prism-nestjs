import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { INTERNAL_REQUIRED_SCOPES_KEY } from '@/modules/admin/constants';
import { InternalScopeRequiredError } from '@/modules/admin/errors';
import { InternalUseCase } from '@/modules/admin/usecases';
import type {
  InternalAuthenticatedRequest,
  InternalScope,
  InternalServicePrincipal,
} from '@/modules/admin/types';

@Injectable()
export class InternalAuthenticationGuard implements CanActivate {
  constructor(
    private readonly usecase: InternalUseCase,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & InternalAuthenticatedRequest>();
    const token = this.extractToken(request);
    const principal = await this.usecase.validateServiceApiToken(token);

    this.assertRequiredScopes(principal, context);
    request.internalService = principal;
    return true;
  }

  private assertRequiredScopes(
    principal: InternalServicePrincipal,
    context: ExecutionContext,
  ): void {
    const requiredScopes =
      this.reflector.getAllAndMerge<InternalScope[]>(
        INTERNAL_REQUIRED_SCOPES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (
      requiredScopes.length > 0 &&
      !requiredScopes.every((scope) => principal.scopes.includes(scope))
    ) {
      throw new InternalScopeRequiredError();
    }
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
