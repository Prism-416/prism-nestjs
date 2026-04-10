import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '@/core/auth/jwt-token.service';

export const CurrentUser = createParamDecorator((_data, ctx) => {
  const request = ctx
    .switchToHttp()
    .getRequest<Request & { user?: JwtPayload }>();
  return request.user;
});
