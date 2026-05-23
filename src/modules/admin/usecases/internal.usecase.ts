import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import {
  InternalApiTokenExpiredError,
  InternalApiTokenExpiresAtInvalidError,
  InternalApiTokenInvalidError,
  InternalApiTokenNotFoundError,
  InternalApiTokenRevokedError,
  InternalApiTokenUpdateEmptyError,
  InternalNameInvalidError,
  InternalScopeInvalidError,
  InternalServiceAccountAlreadyExistsError,
  InternalServiceAccountInactiveError,
  InternalServiceAccountNotFoundError,
  InternalServiceAccountUpdateEmptyError,
  isServiceAccountNameUniqueViolation,
} from '@/modules/admin/errors';
import {
  AdminAuditRepository,
  InternalRepository,
} from '@/modules/admin/repository';
import { InternalTokenService } from '@/modules/admin/services';
import {
  AdminAuditContext,
  CreatedInternalApiToken,
  CreateAdminAuditEventParams,
  CreateInternalApiTokenParams,
  CreateInternalApiTokenForServiceNameParams,
  CreateInternalServiceAccountParams,
  InternalApiTokenHealthSummary,
  InternalApiTokenHealthSummaryParams,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
  INTERNAL_SCOPES,
  InternalScope,
  InternalServiceAccountHealthSummary,
  InternalServiceAccountRow,
  InternalServicePrincipal,
  SearchInternalApiTokensParams,
  SearchInternalApiTokensResult,
  UpdateInternalApiTokenParams,
  UpdateInternalServiceAccountParams,
} from '@/modules/admin/types';

@Injectable()
export class InternalUseCase {
  constructor(
    private readonly repo: InternalRepository,
    private readonly auditRepo: AdminAuditRepository,
    private readonly tokenService: InternalTokenService,
    private readonly uow: UnitOfWork,
  ) {}

  async createServiceAccount(
    params: CreateInternalServiceAccountParams,
    auditContext: AdminAuditContext,
  ): Promise<InternalServiceAccountRow> {
    const name = this.normalizeRequiredText(params.name);
    const description = this.normalizeOptionalText(params.description);

    try {
      return await this.uow.run(async (manager) => {
        const serviceAccount = await this.repo.createServiceAccount(
          {
            name,
            description,
          },
          manager,
        );

        await this.recordAdminAuditEvent(
          auditContext,
          {
            action: 'service_account.create',
            targetType: 'service_account',
            targetId: serviceAccount.serviceAccountId,
            targetName: serviceAccount.name,
          },
          manager,
        );

        return serviceAccount;
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

  async updateServiceAccount(
    params: UpdateInternalServiceAccountParams,
    auditContext: AdminAuditContext,
  ): Promise<InternalServiceAccountRow> {
    const name =
      params.name === undefined
        ? null
        : this.normalizeRequiredText(params.name);
    const updateDescription = params.description !== undefined;
    const description = updateDescription
      ? this.normalizeOptionalText(params.description)
      : null;

    if (name === null && !updateDescription) {
      throw new InternalServiceAccountUpdateEmptyError();
    }

    try {
      return await this.uow.run(async (manager) => {
        const serviceAccount = await this.repo.updateServiceAccount(
          {
            serviceAccountId: params.serviceAccountId,
            name,
            description,
            updateDescription,
          },
          manager,
        );
        if (!serviceAccount) {
          throw new InternalServiceAccountNotFoundError();
        }

        await this.recordAdminAuditEvent(
          auditContext,
          {
            action: 'service_account.update',
            targetType: 'service_account',
            targetId: serviceAccount.serviceAccountId,
            targetName: serviceAccount.name,
          },
          manager,
        );

        return serviceAccount;
      });
    } catch (error) {
      if (isServiceAccountNameUniqueViolation(error)) {
        throw new InternalServiceAccountAlreadyExistsError();
      }

      throw error;
    }
  }

  async activateServiceAccount(
    serviceAccountId: string,
    auditContext: AdminAuditContext,
  ): Promise<InternalServiceAccountRow> {
    return this.updateServiceAccountActiveStatus(
      serviceAccountId,
      true,
      auditContext,
    );
  }

  async deactivateServiceAccount(
    serviceAccountId: string,
    auditContext: AdminAuditContext,
  ): Promise<InternalServiceAccountRow> {
    return this.updateServiceAccountActiveStatus(
      serviceAccountId,
      false,
      auditContext,
    );
  }

  async createServiceApiToken(
    params: CreateInternalApiTokenParams,
    auditContext: AdminAuditContext,
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

      await this.recordAdminAuditEvent(
        auditContext,
        {
          action: 'service_api_token.create',
          targetType: 'service_api_token',
          targetId: apiToken.apiTokenId,
          targetName: apiToken.name,
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
    auditContext: AdminAuditContext,
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
      let serviceAccount = await this.repo.findServiceAccountByName(
        serviceName,
        manager,
      );
      const serviceAccountCreated = serviceAccount === null;

      if (!serviceAccount) {
        serviceAccount = await this.repo.createServiceAccount(
          {
            name: serviceName,
            description: serviceDescription,
          },
          manager,
        );
      }

      if (!serviceAccount.isActive) {
        throw new InternalServiceAccountInactiveError();
      }

      if (serviceAccountCreated) {
        await this.recordAdminAuditEvent(
          auditContext,
          {
            action: 'service_account.create',
            targetType: 'service_account',
            targetId: serviceAccount.serviceAccountId,
            targetName: serviceAccount.name,
          },
          manager,
        );
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

      await this.recordAdminAuditEvent(
        auditContext,
        {
          action: 'service_api_token.create',
          targetType: 'service_api_token',
          targetId: apiToken.apiTokenId,
          targetName: apiToken.name,
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

  searchServiceApiTokens(
    params: Partial<SearchInternalApiTokensParams>,
  ): Promise<SearchInternalApiTokensResult> {
    return this.repo.searchServiceApiTokens({
      serviceAccountId:
        this.normalizeOptionalText(params.serviceAccountId) ?? undefined,
      serviceName: this.normalizeOptionalText(params.serviceName) ?? undefined,
      status: params.status,
      expiresBefore: params.expiresBefore,
      lastUsedBefore: params.lastUsedBefore,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  getServiceApiTokenHealthSummary(
    params: Partial<InternalApiTokenHealthSummaryParams>,
  ): Promise<InternalApiTokenHealthSummary> {
    return this.repo.getServiceApiTokenHealthSummary({
      expiringWithinDays: params.expiringWithinDays ?? 30,
      staleAfterDays: params.staleAfterDays ?? 90,
    });
  }

  getServiceAccountHealthSummary(): Promise<InternalServiceAccountHealthSummary> {
    return this.repo.getServiceAccountHealthSummary();
  }

  async updateServiceApiToken(
    params: UpdateInternalApiTokenParams,
    auditContext: AdminAuditContext,
  ): Promise<InternalApiTokenRow> {
    const name =
      params.name === undefined
        ? null
        : this.normalizeRequiredText(params.name);
    const updateScopes = params.scopes !== undefined;
    const scopes =
      params.scopes === undefined ? null : this.normalizeScopes(params.scopes);
    const updateExpiresAt = params.expiresAt !== undefined;
    const expiresAt = params.expiresAt ?? null;

    if (name === null && !updateScopes && !updateExpiresAt) {
      throw new InternalApiTokenUpdateEmptyError();
    }

    if (expiresAt && expiresAt <= new Date()) {
      throw new InternalApiTokenExpiresAtInvalidError();
    }

    return this.uow.run(async (manager) => {
      const token = await this.repo.updateServiceApiToken(
        {
          apiTokenId: params.apiTokenId,
          name,
          scopes,
          expiresAt,
          updateScopes,
          updateExpiresAt,
        },
        manager,
      );
      if (!token) {
        throw new InternalApiTokenNotFoundError();
      }

      await this.recordAdminAuditEvent(
        auditContext,
        {
          action: 'service_api_token.update',
          targetType: 'service_api_token',
          targetId: token.apiTokenId,
          targetName: token.name,
        },
        manager,
      );

      return token;
    });
  }

  async revokeServiceApiToken(
    apiTokenId: string,
    auditContext: AdminAuditContext,
  ): Promise<InternalApiTokenRow> {
    return this.uow.run(async (manager) => {
      const token = await this.repo.revokeServiceApiToken(apiTokenId, manager);
      if (!token) {
        throw new InternalApiTokenNotFoundError();
      }

      await this.recordAdminAuditEvent(
        auditContext,
        {
          action: 'service_api_token.revoke',
          targetType: 'service_api_token',
          targetId: token.apiTokenId,
          targetName: token.name,
        },
        manager,
      );

      return token;
    });
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

  private async updateServiceAccountActiveStatus(
    serviceAccountId: string,
    isActive: boolean,
    auditContext: AdminAuditContext,
  ): Promise<InternalServiceAccountRow> {
    return this.uow.run(async (manager) => {
      const serviceAccount = await this.repo.updateServiceAccountActiveStatus(
        serviceAccountId,
        isActive,
        manager,
      );
      if (!serviceAccount) {
        throw new InternalServiceAccountNotFoundError();
      }

      await this.recordAdminAuditEvent(
        auditContext,
        {
          action: isActive
            ? 'service_account.activate'
            : 'service_account.deactivate',
          targetType: 'service_account',
          targetId: serviceAccount.serviceAccountId,
          targetName: serviceAccount.name,
        },
        manager,
      );

      return serviceAccount;
    });
  }

  private async recordAdminAuditEvent(
    auditContext: AdminAuditContext,
    event: Omit<CreateAdminAuditEventParams, keyof AdminAuditContext>,
    manager: EntityManager,
  ): Promise<void> {
    await this.auditRepo.createAuditEvent(
      {
        ...auditContext,
        actorId: this.normalizeOptionalText(auditContext.actorId),
        requestId: this.normalizeOptionalText(auditContext.requestId),
        reason: this.normalizeOptionalText(auditContext.reason),
        ...event,
      },
      manager,
    );
  }
}
