import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InternalAuthenticationGuard } from '@/modules/admin/guards/internal-authentication.guard';
import {
  InternalApiTokenInvalidError,
  InternalScopeRequiredError,
} from '@/modules/admin/errors';
import { InternalUseCase } from '@/modules/admin/usecases';
import type { InternalScope } from '@/modules/admin/types';

describe('InternalAuthenticationGuard', () => {
  let internalUseCase: jest.Mocked<
    Pick<InternalUseCase, 'validateServiceApiToken'>
  >;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndMerge'>>;
  let guard: InternalAuthenticationGuard;

  const createContext = (headers: Record<string, string>): ExecutionContext => {
    const request = { headers };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    internalUseCase = {
      validateServiceApiToken: jest.fn(),
    };
    reflector = {
      getAllAndMerge: jest.fn().mockReturnValue([]),
    };
    guard = new InternalAuthenticationGuard(
      internalUseCase as unknown as InternalUseCase,
      reflector as unknown as Reflector,
    );
  });

  it('rejects a user bearer token that is not an internal API token', async () => {
    internalUseCase.validateServiceApiToken.mockRejectedValue(
      new InternalApiTokenInvalidError(),
    );

    await expect(
      guard.canActivate(
        createContext({ authorization: 'Bearer user.jwt.token' }),
      ),
    ).rejects.toBeInstanceOf(InternalApiTokenInvalidError);
    expect(internalUseCase.validateServiceApiToken).toHaveBeenCalledWith(
      'user.jwt.token',
    );
  });

  it('rejects valid internal tokens that do not include the required scope', async () => {
    reflector.getAllAndMerge.mockReturnValue([
      'pull_requests:write',
    ] satisfies InternalScope[]);
    internalUseCase.validateServiceApiToken.mockResolvedValue({
      serviceAccountId: '11111111-1111-4111-8111-111111111111',
      serviceName: 'prism-agent',
      apiTokenId: '22222222-2222-4222-8222-222222222222',
      tokenName: 'agent',
      scopes: ['repositories:read'],
    });

    await expect(
      guard.canActivate(
        createContext({ 'x-internal-api-token': 'prism_it_token.secret' }),
      ),
    ).rejects.toBeInstanceOf(InternalScopeRequiredError);
  });
});
