import { UseGuards, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthenticationGuard } from '@/modules/admin/guards';

export function AdminAuthenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminAuthenticationGuard),
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Admin access required' }),
  );
}
