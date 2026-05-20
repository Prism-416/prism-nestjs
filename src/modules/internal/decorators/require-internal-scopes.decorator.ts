import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { INTERNAL_REQUIRED_SCOPES_KEY } from '@/modules/internal/constants';
import { InternalScope } from '@/modules/internal/types';
import { InternalAuthenticated } from './internal-authenticated.decorator';

export function RequireInternalScopes(
  ...scopes: InternalScope[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    InternalAuthenticated(),
    SetMetadata(INTERNAL_REQUIRED_SCOPES_KEY, scopes),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );
}
