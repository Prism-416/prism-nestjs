import { AdminServiceTokenController } from '@/modules/admin/controller';
import {
  CreatedInternalApiToken,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
} from '@/modules/admin/types';
import { InternalUseCase } from '@/modules/admin/usecases';

describe('AdminServiceTokenController', () => {
  it('issues a token while omitting the persisted token hash', async () => {
    const created = buildCreatedToken();
    const issueServiceToken = jest.fn().mockResolvedValue(created);
    const usecase = buildUseCase({
      createServiceApiTokenForServiceName: issueServiceToken,
    });
    const controller = new AdminServiceTokenController(usecase);

    const response = await controller.issueServiceApiToken({
      serviceName: 'embedding-worker',
      tokenName: 'production-worker',
      scopes: ['embeddings:write'],
      expiresAt: created.apiToken.expiresAt,
    });

    expect(issueServiceToken).toHaveBeenCalledWith({
      serviceName: 'embedding-worker',
      serviceDescription: undefined,
      tokenName: 'production-worker',
      scopes: ['embeddings:write'],
      expiresAt: created.apiToken.expiresAt,
    });
    expect(response.token).toBe(created.token);
    expect(response.apiToken).not.toHaveProperty('tokenHash');
  });

  it('lists token metadata without exposing token hashes', async () => {
    const token = buildTokenMetadata();
    const listServiceTokens = jest.fn().mockResolvedValue([token]);
    const usecase = buildUseCase({
      listServiceApiTokensForServiceAccount: listServiceTokens,
    });
    const controller = new AdminServiceTokenController(usecase);

    const response = await controller.listServiceApiTokens('service-account-1');

    expect(listServiceTokens).toHaveBeenCalledWith('service-account-1');
    expect(response).toHaveLength(1);
    expect(response[0]).toEqual(token);
    expect(response[0]).not.toHaveProperty('tokenHash');
  });

  it('revokes a token without exposing the persisted token hash', async () => {
    const token = buildTokenRow();
    const revokeServiceToken = jest.fn().mockResolvedValue(token);
    const usecase = buildUseCase({
      revokeServiceApiToken: revokeServiceToken,
    });
    const controller = new AdminServiceTokenController(usecase);

    const response = await controller.revokeServiceApiToken('api-token-1');

    expect(revokeServiceToken).toHaveBeenCalledWith('api-token-1');
    expect(response.revokedAt).toBe(token.revokedAt);
    expect(response).not.toHaveProperty('tokenHash');
  });
});

function buildUseCase(
  overrides: Partial<Record<keyof InternalUseCase, jest.Mock>>,
): InternalUseCase {
  return {
    listServiceAccounts: jest.fn(),
    createServiceAccount: jest.fn(),
    createServiceApiToken: jest.fn(),
    createServiceApiTokenForServiceName: jest.fn(),
    listServiceApiTokensForServiceAccount: jest.fn(),
    revokeServiceApiToken: jest.fn(),
    validateServiceApiToken: jest.fn(),
    ...overrides,
  } as unknown as InternalUseCase;
}

function buildCreatedToken(): CreatedInternalApiToken {
  return {
    token: 'prism_internal_raw-token',
    apiToken: buildTokenRow(),
  };
}

function buildTokenRow(): InternalApiTokenRow {
  return {
    ...buildTokenMetadata(),
    tokenHash: 'persisted-token-hash',
  };
}

function buildTokenMetadata(): InternalApiTokenMetadataRow {
  return {
    apiTokenId: 'api-token-1',
    serviceAccountId: 'service-account-1',
    name: 'production-worker',
    tokenPrefix: 'prism_internal_12345678',
    scopes: ['embeddings:write'],
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    lastUsedAt: null,
    revokedAt: new Date('2029-01-01T00:00:00.000Z'),
    createdAt: new Date('2028-01-01T00:00:00.000Z'),
    updatedAt: new Date('2029-01-01T00:00:00.000Z'),
  };
}
