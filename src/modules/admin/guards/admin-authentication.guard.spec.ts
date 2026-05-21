import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminAuthenticationGuard } from '@/modules/admin/guards';

describe('AdminAuthenticationGuard', () => {
  it('allows requests with the configured admin password', () => {
    const guard = buildGuard('secret-admin-password');
    const context = buildHttpContext({
      'x-admin-password': 'secret-admin-password',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects requests when admin password is not configured', () => {
    const guard = buildGuard('');
    const context = buildHttpContext({
      'x-admin-password': 'secret-admin-password',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects requests with an invalid admin password', () => {
    const guard = buildGuard('secret-admin-password');
    const context = buildHttpContext({
      'x-admin-password': 'wrong-password',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects requests with duplicate admin password headers', () => {
    const guard = buildGuard('secret-admin-password');
    const context = buildHttpContext({
      'x-admin-password': ['secret-admin-password', 'other-password'],
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

function buildGuard(adminPassword: string): AdminAuthenticationGuard {
  const configService = {
    get: jest.fn((key: string, defaultValue: string) =>
      key === 'ADMIN_PASSWORD' ? adminPassword : defaultValue,
    ),
  } as unknown as ConfigService;

  return new AdminAuthenticationGuard(configService);
}

function buildHttpContext(
  headers: Record<string, string | string[]>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}
