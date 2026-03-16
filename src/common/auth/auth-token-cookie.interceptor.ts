import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { REFRESH_TOKEN_COOKIE } from '@/common/auth/refresh-token.decorator';

type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

type AuthTokenResponse = {
  accessToken: string;
};

@Injectable()
export class AuthTokenCookieInterceptor implements NestInterceptor<
  AuthTokenPair,
  AuthTokenResponse
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<AuthTokenPair>,
  ): Observable<AuthTokenResponse> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((tokens) => {
        response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge:
            Number(process.env.JWT_REFRESH_EXPIRES_IN_SEC ?? 1209600) * 1000,
        });

        return {
          accessToken: tokens.accessToken,
        };
      }),
    );
  }
}
