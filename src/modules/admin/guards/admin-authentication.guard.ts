import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const ADMIN_PASSWORD_HEADER = 'x-admin-password';

@Injectable()
export class AdminAuthenticationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredPassword = this.getConfiguredPassword();
    const suppliedPassword = this.extractAdminPassword(request);

    if (
      !configuredPassword ||
      !suppliedPassword ||
      !this.matchesPassword(suppliedPassword, configuredPassword)
    ) {
      throw new UnauthorizedException('Invalid admin password');
    }

    return true;
  }

  private getConfiguredPassword(): string {
    return this.configService.get<string>('ADMIN_PASSWORD', '').trim();
  }

  private extractAdminPassword(request: Request): string | null {
    const password = request.headers[ADMIN_PASSWORD_HEADER];
    if (Array.isArray(password)) {
      throw new UnauthorizedException('Invalid admin password header format');
    }

    return typeof password === 'string' && password.trim()
      ? password.trim()
      : null;
  }

  private matchesPassword(supplied: string, configured: string): boolean {
    return timingSafeEqual(
      this.hashPassword(supplied),
      this.hashPassword(configured),
    );
  }

  private hashPassword(password: string): Buffer {
    return createHash('sha256').update(password).digest();
  }
}
