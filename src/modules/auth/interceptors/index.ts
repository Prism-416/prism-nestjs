import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { finalize, Observable, tap } from 'rxjs';
import { GITHUB_OAUTH_TRANSACTION_COOKIE } from '@/modules/auth/services';

@Injectable()
export class GitHubOAuthCookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    let shouldClearTransactionCookie = false;

    return next.handle().pipe(
      tap({
        next: () => {
          shouldClearTransactionCookie = true;
        },
        error: (error: unknown) => {
          if (!(error instanceof BadRequestException)) {
            shouldClearTransactionCookie = true;
          }
        },
      }),
      finalize(() => {
        if (shouldClearTransactionCookie) {
          response.clearCookie(GITHUB_OAUTH_TRANSACTION_COOKIE, { path: '/' });
        }
      }),
    );
  }
}
