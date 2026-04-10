import {
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export const RefreshToken = createParamDecorator((_data, context) => {
  const request = context
    .switchToHttp()
    .getRequest<{ headers: { cookie?: string } }>();
  const refreshToken =
    parseCookies(request.headers.cookie)[REFRESH_TOKEN_COOKIE];

  if (!refreshToken) {
    throw new UnauthorizedException('Missing refresh token cookie');
  }

  return refreshToken;
});

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>(
    (cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (!name) {
        return cookies;
      }

      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    },
    {},
  );
}
