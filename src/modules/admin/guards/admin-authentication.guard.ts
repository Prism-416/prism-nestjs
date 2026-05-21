import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtAuthenticationGuard, type JwtPayload } from '@/core/auth';

@Injectable()
export class AdminAuthenticationGuard implements CanActivate {
  constructor(
    private readonly jwtAuthenticationGuard: JwtAuthenticationGuard,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    this.jwtAuthenticationGuard.canActivate(context);

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const userId = request.user?.sub;
    const adminUserIds = this.getAdminUserIds();

    if (!userId || !adminUserIds.has(userId)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }

  private getAdminUserIds(): Set<string> {
    const configured = this.configService.get<string>('ADMIN_USER_IDS', '');
    return new Set(
      configured
        .split(',')
        .map((userId) => userId.trim())
        .filter(Boolean),
    );
  }
}
