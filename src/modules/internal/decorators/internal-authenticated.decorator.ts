import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { InternalAuthenticationGuard } from '@/modules/internal/guards';

export function InternalAuthenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(InternalAuthenticationGuard),
    ApiBearerAuth('internal'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
