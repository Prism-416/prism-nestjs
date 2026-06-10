import { UseGuards, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InternalAuthenticationGuard } from '@/modules/admin/guards';

export function InternalAuthenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(InternalAuthenticationGuard),
    ApiHeader({
      name: 'x-internal-api-token',
      description: 'Internal service API token.',
      required: true,
    }),
    ApiBearerAuth('internal'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
