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
  accessToken?: string;
  refreshToken?: string;
  newUser?: boolean;
};

type AuthTokenResponse = {
  accessToken?: string;
  newUser?: boolean;
};

@Injectable()
export class AuthTokenCookieInterceptor
  implements NestInterceptor<AuthTokenPair, AuthTokenResponse>
{
  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<AuthTokenPair>,
  ): Observable<AuthTokenResponse> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((tokens) => {
        if (tokens.refreshToken) {
          response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge:
              this.configService.get<number>(
                'JWT_REFRESH_EXPIRES_IN_SEC',
                1209600,
              ) * 1000,
          });
        } else {
          response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
        }

        return {
          ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
          ...(tokens.newUser !== undefined ? { newUser: tokens.newUser } : {}),
        };
      }),
    );
  }
}
