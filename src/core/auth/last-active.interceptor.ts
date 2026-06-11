import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import type { JwtPayload } from '@/core/auth/jwt-token.service';
import { LastActiveService } from '@/core/auth/last-active.service';

/**
 * Runs after the authentication guard, so `request.user` is already populated
 * for authenticated routes. Unauthenticated requests have no user and are
 * skipped. The touch is fire-and-forget inside {@link LastActiveService}.
 */
@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  constructor(private readonly lastActiveService: LastActiveService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const request = context
        .switchToHttp()
        .getRequest<Request & { user?: JwtPayload }>();
      const userId = request.user?.sub;
      if (userId) {
        this.lastActiveService.touch(userId);
      }
    }

    return next.handle();
  }
}
