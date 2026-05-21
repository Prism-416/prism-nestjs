import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  InternalApiTokenExpiredError,
  InternalApiTokenExpiresAtInvalidError,
  InternalApiTokenInvalidError,
  InternalApiTokenNotFoundError,
  InternalApiTokenRevokedError,
  InternalNameInvalidError,
  InternalScopeInvalidError,
  InternalServiceAccountAlreadyExistsError,
  InternalServiceAccountInactiveError,
  InternalServiceAccountNotFoundError,
  isServiceAccountNameUniqueViolation,
} from '@/modules/admin/errors';
import { InternalRepository } from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import {
  CreatedInternalApiToken,
  CreateInternalApiTokenParams,
  CreateInternalApiTokenForServiceNameParams,
  CreateInternalServiceAccountParams,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
  INTERNAL_SCOPES,
  InternalScope,
  InternalServiceAccountRow,
  InternalServicePrincipal,
} from '@/modules/admin/types';

@Injectable()
export class InternalUseCase {
  constructor(
    private readonly repo: InternalRepository,
    private readonly tokenService: InternalTokenService,
    private readonly uow: UnitOfWork,
  ) {}

  async createServiceAccount(
    params: CreateInternalServiceAccountParams,
  ): Promise<InternalServiceAccountRow> {
    try {
      return await this.repo.createServiceAccount({
        name: this.normalizeRequiredText(params.name),
        description: this.normalizeOptionalText(params.description),
      });
    } catch (error) {
      if (isServiceAccountNameUniqueViolation(error)) {
        throw new InternalServiceAccountAlreadyExistsError();
      }

      throw error;
    }
  }

  listServiceAccounts(): Promise<InternalServiceAccountRow[]> {
    return this.repo.listServiceAccounts();
  }

  async createServiceApiToken(
    params: CreateInternalApiTokenParams,
  ): Promise<CreatedInternalApiToken> {
    const name = this.normalizeRequiredText(params.name);
    const scopes = this.normalizeScopes(params.scopes);

    if (params.expiresAt <= new Date()) {
      throw new InternalApiTokenExpiresAtInvalidError();
    }

    return this.uow.run(async (manager) => {
      const serviceAccount = await this.repo.findServiceAccountById(
        params.serviceAccountId,
        manager,
      );
      if (!serviceAccount) {
        throw new InternalServiceAccountNotFoundError();
      }

      if (!serviceAccount.isActive) {
        throw new InternalServiceAccountInactiveError();
      }

      const generated = this.tokenService.generateToken();
      const apiToken = await this.repo.createServiceApiToken(
        {
          serviceAccountId: serviceAccount.serviceAccountId,
          name,
          scopes,
          expiresAt: params.expiresAt,
          tokenPrefix: generated.tokenPrefix,
          tokenHash: generated.tokenHash,
        },
        manager,
      );

      return {
        token: generated.token,
        apiToken,
      };
    });
  }

  async createServiceApiTokenForServiceName(
    params: CreateInternalApiTokenForServiceNameParams,
  ): Promise<CreatedInternalApiToken> {
    const serviceName = this.normalizeRequiredText(params.serviceName);
    const tokenName = this.normalizeRequiredText(params.tokenName);
    const serviceDescription = this.normalizeOptionalText(
      params.serviceDescription,
    );
    const scopes = this.normalizeScopes(params.scopes);

    if (params.expiresAt <= new Date()) {
      throw new InternalApiTokenExpiresAtInvalidError();
    }

    return this.uow.run(async (manager) => {
      const serviceAccount =
        (await this.repo.findServiceAccountByName(serviceName, manager)) ??
        (await this.repo.createServiceAccount(
          {
            name: serviceName,
            description: serviceDescription,
          },
          manager,
        ));

      if (!serviceAccount.isActive) {
        throw new InternalServiceAccountInactiveError();
      }

      const generated = this.tokenService.generateToken();
      const apiToken = await this.repo.createServiceApiToken(
        {
          serviceAccountId: serviceAccount.serviceAccountId,
          name: tokenName,
          scopes,
          expiresAt: params.expiresAt,
          tokenPrefix: generated.tokenPrefix,
          tokenHash: generated.tokenHash,
        },
        manager,
      );

      return {
        token: generated.token,
        apiToken,
      };
    });
  }

  async listServiceApiTokensForServiceAccount(
    serviceAccountId: string,
  ): Promise<InternalApiTokenMetadataRow[]> {
    const serviceAccount =
      await this.repo.findServiceAccountById(serviceAccountId);
    if (!serviceAccount) {
      throw new InternalServiceAccountNotFoundError();
    }

    return this.repo.listServiceApiTokensForServiceAccount(serviceAccountId);
  }

  async revokeServiceApiToken(
    apiTokenId: string,
  ): Promise<InternalApiTokenRow> {
    const token = await this.repo.revokeServiceApiToken(apiTokenId);
    if (!token) {
      throw new InternalApiTokenNotFoundError();
    }

    return token;
  }

  async validateServiceApiToken(
    rawToken: string,
    now = new Date(),
  ): Promise<InternalServicePrincipal> {
    const tokenPrefix = this.tokenService.parseTokenPrefix(rawToken);
    if (!tokenPrefix) {
      throw new InternalApiTokenInvalidError();
    }

    const token = await this.repo.findServiceApiTokenByPrefix(tokenPrefix);
    if (!token || !this.tokenService.verifyToken(rawToken, token.tokenHash)) {
      throw new InternalApiTokenInvalidError();
    }

    if (!token.serviceActive) {
      throw new InternalServiceAccountInactiveError();
    }

    if (token.revokedAt) {
      throw new InternalApiTokenRevokedError();
    }

    if (token.expiresAt <= now) {
      throw new InternalApiTokenExpiredError();
    }

    await this.repo.updateServiceApiTokenLastUsedAt(token.apiTokenId, now);

    return {
      serviceAccountId: token.serviceAccountId,
      serviceName: token.serviceName,
      apiTokenId: token.apiTokenId,
      tokenName: token.name,
      scopes: token.scopes,
    };
  }

  private normalizeRequiredText(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new InternalNameInvalidError();
    }

    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeScopes(scopes: InternalScope[]): InternalScope[] {
    const normalized = [...new Set(scopes.map((scope) => scope.trim()))];
    const validScopes = new Set<string>(INTERNAL_SCOPES);

    if (
      normalized.length === 0 ||
      normalized.some((scope) => !scope || !validScopes.has(scope))
    ) {
      throw new InternalScopeInvalidError();
    }

    return normalized as InternalScope[];
  }
}
