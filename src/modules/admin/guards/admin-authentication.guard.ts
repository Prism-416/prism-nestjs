import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { AdminPasswordAttemptLimiterService } from '@/modules/admin/services';

const ADMIN_PASSWORD_HEADER = 'x-admin-password';

@Injectable()
export class AdminAuthenticationGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly attemptLimiter: AdminPasswordAttemptLimiterService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const clientKey = this.attemptLimiter.getClientKey(request);
    const existingRetryAfter =
      this.attemptLimiter.getRetryAfterSeconds(clientKey);

    if (existingRetryAfter !== null) {
      this.rejectRateLimited(response, existingRetryAfter);
    }

    const configuredPassword = this.getConfiguredPassword();
    const { suppliedPassword, hasInvalidHeaderFormat } =
      this.extractAdminPassword(request);

    if (
      hasInvalidHeaderFormat ||
      !configuredPassword ||
      !suppliedPassword ||
      !this.matchesPassword(suppliedPassword, configuredPassword)
    ) {
      const retryAfter = this.attemptLimiter.recordFailure(clientKey);
      if (retryAfter !== null) {
        this.rejectRateLimited(response, retryAfter);
      }

      throw new UnauthorizedException('Invalid admin password');
    }

    this.attemptLimiter.recordSuccess(clientKey);
    return true;
  }

  private getConfiguredPassword(): string {
    return this.configService.get<string>('ADMIN_PASSWORD', '').trim();
  }

  private extractAdminPassword(request: Request): {
    suppliedPassword: string | null;
    hasInvalidHeaderFormat: boolean;
  } {
    const password = request.headers[ADMIN_PASSWORD_HEADER];
    if (Array.isArray(password)) {
      return {
        suppliedPassword: null,
        hasInvalidHeaderFormat: true,
      };
    }

    return {
      suppliedPassword:
        typeof password === 'string' && password.trim()
          ? password.trim()
          : null,
      hasInvalidHeaderFormat: false,
    };
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

  private rejectRateLimited(
    response: Response,
    retryAfterSeconds: number,
  ): never {
    response.setHeader('Retry-After', String(retryAfterSeconds));
    throw new HttpException(
      'Too many invalid admin password attempts',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
