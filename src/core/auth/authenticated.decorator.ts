import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from './jwt-authentication.guard';

export function Authenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAuthenticationGuard),
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
