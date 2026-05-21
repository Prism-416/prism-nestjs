import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type {
  InternalAuthenticatedRequest,
  InternalServicePrincipal,
} from '@/modules/admin/types';

export const CurrentInternalService = createParamDecorator(
  (_data, ctx): InternalServicePrincipal | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & InternalAuthenticatedRequest>();
    return request.internalService;
  },
);
