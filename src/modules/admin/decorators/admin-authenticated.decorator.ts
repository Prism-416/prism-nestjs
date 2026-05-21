import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthenticationGuard } from '@/modules/admin/guards';

export function AdminAuthenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminAuthenticationGuard),
    ApiSecurity('admin-password'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
