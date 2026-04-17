import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { finalize, map, Observable, tap } from 'rxjs';
import { setRefreshTokenCookie } from '@/core/auth';
import { GITHUB_OAUTH_TRANSACTION_COOKIE } from '@/modules/auth/constants';
import type { GithubOAuthCallbackResult } from '@/modules/auth/usecases/github.usecase';

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

@Injectable()
export class GitHubOAuthCallbackInterceptor implements NestInterceptor<
  GithubOAuthCallbackResult,
  void
> {
  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<GithubOAuthCallbackResult>,
  ): Observable<void> {
    const response = context.switchToHttp().getResponse<Response>();
    let shouldClearTransactionCookie = false;

    return next.handle().pipe(
      tap({
        next: (result) => {
          shouldClearTransactionCookie = result.clearTransactionCookie;

          if (result.refreshToken) {
            setRefreshTokenCookie(
              response,
              this.configService,
              result.refreshToken,
            );
          }

          response.redirect(HttpStatus.FOUND, result.redirectUrl);
        },
        error: () => {
          shouldClearTransactionCookie = true;
        },
      }),
      map(() => undefined),
      finalize(() => {
        if (shouldClearTransactionCookie) {
          response.clearCookie(GITHUB_OAUTH_TRANSACTION_COOKIE, { path: '/' });
        }
      }),
    );
  }
}
