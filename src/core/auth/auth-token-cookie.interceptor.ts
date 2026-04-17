import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import { REFRESH_TOKEN_COOKIE } from './refresh-token.decorator';

type AuthTokenPair = {
  accessToken: string;
  refreshToken?: string;
};

type AuthTokenResponse = {
  accessToken: string;
};

type RefreshTokenResult = {
  refreshToken?: string;
};

export const setRefreshTokenCookie = (
  response: Response,
  configService: ConfigService,
  refreshToken: string,
) => {
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: configService.get('NODE_ENV') === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge:
      configService.get<number>('JWT_REFRESH_EXPIRES_IN_SEC', 1209600) * 1000,
  });
};

@Injectable()
export class AuthTokenCookieInterceptor implements NestInterceptor<
  AuthTokenPair,
  AuthTokenResponse
> {
  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<AuthTokenPair>,
  ): Observable<AuthTokenResponse> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((tokens) => {
        if (tokens.refreshToken) {
          setRefreshTokenCookie(
            response,
            this.configService,
            tokens.refreshToken,
          );
        }

        return {
          accessToken: tokens.accessToken,
        };
      }),
    );
  }
}

@Injectable()
export class RefreshTokenCookieInterceptor implements NestInterceptor<
  RefreshTokenResult,
  Record<string, never>
> {
  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<RefreshTokenResult>,
  ): Observable<Record<string, never>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((tokens) => {
        if (tokens.refreshToken) {
          setRefreshTokenCookie(
            response,
            this.configService,
            tokens.refreshToken,
          );
        }

        return {};
      }),
    );
  }
}
