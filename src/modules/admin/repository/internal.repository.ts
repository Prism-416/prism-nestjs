import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateInternalServiceAccountParams,
  InternalApiTokenHealthSummary,
  InternalApiTokenHealthSummaryParams,
  InternalApiTokenInventoryRow,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
  InternalApiTokenWithServiceRow,
  InternalServiceAccountRow,
  PersistInternalApiTokenParams,
  PersistInternalApiTokenUpdateParams,
  PersistInternalServiceAccountUpdateParams,
  SearchInternalApiTokensParams,
  SearchInternalApiTokensResult,
} from '@/modules/admin/types';

type CountRow = {
  total: string | number;
};

type InternalApiTokenHealthSummaryRow = {
  generatedAt: Date;
  totalTokens: string | number;
  activeTokens: string | number;
  expiredTokens: string | number;
  revokedTokens: string | number;
  expiringSoonTokens: string | number;
  neverUsedActiveTokens: string | number;
  staleActiveTokens: string | number;
  activeTokensOnInactiveAccounts: string | number;
};

@Injectable()
export class InternalRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createServiceAccount(
    params: CreateInternalServiceAccountParams,
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow> {
    const accounts = await this.getManager(manager).query<
      InternalServiceAccountRow[]
    >(
      `
        INSERT INTO prism_service_accounts_m (
          name,
          description
        )
        VALUES ($1, $2)
        RETURNING
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [params.name, params.description ?? null],
    );

    return accounts[0];
  }

  async findServiceAccountById(
    serviceAccountId: string,
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow | null> {
    const accounts = await this.getManager(manager).query<
      InternalServiceAccountRow[]
    >(
      `
        SELECT
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_service_accounts_m
        WHERE service_account_id = $1
        LIMIT 1
      `,
      [serviceAccountId],
    );

    return accounts[0] ?? null;
  }

  async findServiceAccountByName(
    name: string,
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow | null> {
    const accounts = await this.getManager(manager).query<
      InternalServiceAccountRow[]
    >(
      `
        SELECT
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_service_accounts_m
        WHERE name = $1
        LIMIT 1
      `,
      [name],
    );

    return accounts[0] ?? null;
  }

  async listServiceAccounts(
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow[]> {
    return this.getManager(manager).query<InternalServiceAccountRow[]>(
      `
        SELECT
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_service_accounts_m
        ORDER BY name ASC, created_at ASC
      `,
    );
  }

  async updateServiceAccountActiveStatus(
    serviceAccountId: string,
    isActive: boolean,
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow | null> {
    const accounts = await this.getManager(manager).query<
      InternalServiceAccountRow[]
    >(
      `
        UPDATE prism_service_accounts_m
        SET is_active = $2,
            updated_at = NOW()
        WHERE service_account_id = $1
        RETURNING
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [serviceAccountId, isActive],
    );

    return accounts[0] ?? null;
  }

  async updateServiceAccount(
    params: PersistInternalServiceAccountUpdateParams,
    manager?: EntityManager,
  ): Promise<InternalServiceAccountRow | null> {
    const accounts = await this.getManager(manager).query<
      InternalServiceAccountRow[]
    >(
      `
        UPDATE prism_service_accounts_m
        SET name = COALESCE($2, name),
            description = CASE WHEN $3 THEN $4 ELSE description END,
            updated_at = NOW()
        WHERE service_account_id = $1
        RETURNING
          service_account_id AS "serviceAccountId",
          name,
          description,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        params.serviceAccountId,
        params.name,
        params.updateDescription,
        params.description,
      ],
    );

    return accounts[0] ?? null;
  }

  async createServiceApiToken(
    params: PersistInternalApiTokenParams,
    manager?: EntityManager,
  ): Promise<InternalApiTokenRow> {
    const tokens = await this.getManager(manager).query<InternalApiTokenRow[]>(
      `
        INSERT INTO prism_service_api_tokens_l (
          service_account_id,
          name,
          token_prefix,
          token_hash,
          scopes,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          api_token_id AS "apiTokenId",
          service_account_id AS "serviceAccountId",
          name,
          token_prefix AS "tokenPrefix",
          token_hash AS "tokenHash",
          scopes,
          expires_at AS "expiresAt",
          last_used_at AS "lastUsedAt",
          revoked_at AS "revokedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        params.serviceAccountId,
        params.name,
        params.tokenPrefix,
        params.tokenHash,
        params.scopes,
        params.expiresAt,
      ],
    );

    return tokens[0];
  }

  async findServiceApiTokenByPrefix(
    tokenPrefix: string,
    manager?: EntityManager,
  ): Promise<InternalApiTokenWithServiceRow | null> {
    const tokens = await this.getManager(manager).query<
      InternalApiTokenWithServiceRow[]
    >(
      `
        SELECT
          t.api_token_id AS "apiTokenId",
          t.service_account_id AS "serviceAccountId",
          t.name,
          t.token_prefix AS "tokenPrefix",
          t.token_hash AS "tokenHash",
          t.scopes,
          t.expires_at AS "expiresAt",
          t.last_used_at AS "lastUsedAt",
          t.revoked_at AS "revokedAt",
          t.created_at AS "createdAt",
          t.updated_at AS "updatedAt",
          s.name AS "serviceName",
          s.is_active AS "serviceActive"
        FROM prism_service_api_tokens_l t
               INNER JOIN prism_service_accounts_m s
                          ON s.service_account_id = t.service_account_id
        WHERE t.token_prefix = $1
        LIMIT 1
      `,
      [tokenPrefix],
    );

    return tokens[0] ?? null;
  }

  async listServiceApiTokensForServiceAccount(
    serviceAccountId: string,
    manager?: EntityManager,
  ): Promise<InternalApiTokenMetadataRow[]> {
    return this.getManager(manager).query<InternalApiTokenMetadataRow[]>(
      `
        SELECT
          api_token_id AS "apiTokenId",
          service_account_id AS "serviceAccountId",
          name,
          token_prefix AS "tokenPrefix",
          scopes,
          expires_at AS "expiresAt",
          last_used_at AS "lastUsedAt",
          revoked_at AS "revokedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_service_api_tokens_l
        WHERE service_account_id = $1
        ORDER BY created_at DESC, api_token_id DESC
      `,
      [serviceAccountId],
    );
  }

  async searchServiceApiTokens(
    params: SearchInternalApiTokensParams,
    manager?: EntityManager,
  ): Promise<SearchInternalApiTokensResult> {
    const queryParams = [
      params.serviceAccountId ?? null,
      params.serviceName ?? null,
      params.status ?? null,
      params.expiresBefore ?? null,
      params.lastUsedBefore ?? null,
    ];
    const [items, counts] = await Promise.all([
      this.getManager(manager).query<InternalApiTokenInventoryRow[]>(
        `
          SELECT
            t.api_token_id AS "apiTokenId",
            t.service_account_id AS "serviceAccountId",
            t.name,
            t.token_prefix AS "tokenPrefix",
            t.scopes,
            t.expires_at AS "expiresAt",
            t.last_used_at AS "lastUsedAt",
            t.revoked_at AS "revokedAt",
            t.created_at AS "createdAt",
            t.updated_at AS "updatedAt",
            s.name AS "serviceAccountName",
            s.is_active AS "serviceAccountActive",
            CASE
              WHEN t.revoked_at IS NOT NULL THEN 'revoked'
              WHEN t.expires_at <= NOW() THEN 'expired'
              ELSE 'active'
            END AS status
          FROM prism_service_api_tokens_l t
                 INNER JOIN prism_service_accounts_m s
                            ON s.service_account_id = t.service_account_id
          WHERE ($1::UUID IS NULL OR t.service_account_id = $1)
            AND ($2::TEXT IS NULL OR s.name ILIKE '%' || $2 || '%')
            AND (
              $3::TEXT IS NULL
              OR ($3 = 'active' AND t.revoked_at IS NULL AND t.expires_at > NOW())
              OR ($3 = 'expired' AND t.revoked_at IS NULL AND t.expires_at <= NOW())
              OR ($3 = 'revoked' AND t.revoked_at IS NOT NULL)
            )
            AND ($4::TIMESTAMPTZ IS NULL OR t.expires_at <= $4)
            AND ($5::TIMESTAMPTZ IS NULL OR t.last_used_at < $5)
          ORDER BY t.expires_at ASC, t.created_at DESC, t.api_token_id DESC
          LIMIT $6
          OFFSET $7
        `,
        [...queryParams, params.limit, params.offset],
      ),
      this.getManager(manager).query<CountRow[]>(
        `
          SELECT COUNT(*) AS total
          FROM prism_service_api_tokens_l t
                 INNER JOIN prism_service_accounts_m s
                            ON s.service_account_id = t.service_account_id
          WHERE ($1::UUID IS NULL OR t.service_account_id = $1)
            AND ($2::TEXT IS NULL OR s.name ILIKE '%' || $2 || '%')
            AND (
              $3::TEXT IS NULL
              OR ($3 = 'active' AND t.revoked_at IS NULL AND t.expires_at > NOW())
              OR ($3 = 'expired' AND t.revoked_at IS NULL AND t.expires_at <= NOW())
              OR ($3 = 'revoked' AND t.revoked_at IS NOT NULL)
            )
            AND ($4::TIMESTAMPTZ IS NULL OR t.expires_at <= $4)
            AND ($5::TIMESTAMPTZ IS NULL OR t.last_used_at < $5)
        `,
        queryParams,
      ),
    ]);

    return {
      items,
      total: Number(counts[0]?.total ?? 0),
      limit: params.limit,
      offset: params.offset,
    };
  }

  async getServiceApiTokenHealthSummary(
    params: InternalApiTokenHealthSummaryParams,
    manager?: EntityManager,
  ): Promise<InternalApiTokenHealthSummary> {
    const rows = await this.getManager(manager).query<
      InternalApiTokenHealthSummaryRow[]
    >(
      `
        SELECT
          NOW() AS "generatedAt",
          COUNT(*) AS "totalTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at > NOW()
          ) AS "activeTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at <= NOW()
          ) AS "expiredTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NOT NULL
          ) AS "revokedTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at > NOW()
              AND t.expires_at <= NOW() + ($1::INT * INTERVAL '1 day')
          ) AS "expiringSoonTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at > NOW()
              AND t.last_used_at IS NULL
          ) AS "neverUsedActiveTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at > NOW()
              AND t.last_used_at < NOW() - ($2::INT * INTERVAL '1 day')
          ) AS "staleActiveTokens",
          COUNT(*) FILTER (
            WHERE t.revoked_at IS NULL
              AND t.expires_at > NOW()
              AND s.is_active = FALSE
          ) AS "activeTokensOnInactiveAccounts"
        FROM prism_service_api_tokens_l t
               INNER JOIN prism_service_accounts_m s
                          ON s.service_account_id = t.service_account_id
      `,
      [params.expiringWithinDays, params.staleAfterDays],
    );
    const row = rows[0];

    return {
      generatedAt: row.generatedAt,
      expiringWithinDays: params.expiringWithinDays,
      staleAfterDays: params.staleAfterDays,
      totalTokens: Number(row.totalTokens),
      activeTokens: Number(row.activeTokens),
      expiredTokens: Number(row.expiredTokens),
      revokedTokens: Number(row.revokedTokens),
      expiringSoonTokens: Number(row.expiringSoonTokens),
      neverUsedActiveTokens: Number(row.neverUsedActiveTokens),
      staleActiveTokens: Number(row.staleActiveTokens),
      activeTokensOnInactiveAccounts: Number(
        row.activeTokensOnInactiveAccounts,
      ),
    };
  }

  async updateServiceApiToken(
    params: PersistInternalApiTokenUpdateParams,
    manager?: EntityManager,
  ): Promise<InternalApiTokenRow | null> {
    const tokens = await this.getManager(manager).query<InternalApiTokenRow[]>(
      `
        UPDATE prism_service_api_tokens_l
        SET name = COALESCE($2, name),
            scopes = CASE WHEN $3 THEN $4 ELSE scopes END,
            expires_at = CASE WHEN $5 THEN $6 ELSE expires_at END,
            updated_at = NOW()
        WHERE api_token_id = $1
        RETURNING
          api_token_id AS "apiTokenId",
          service_account_id AS "serviceAccountId",
          name,
          token_prefix AS "tokenPrefix",
          token_hash AS "tokenHash",
          scopes,
          expires_at AS "expiresAt",
          last_used_at AS "lastUsedAt",
          revoked_at AS "revokedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        params.apiTokenId,
        params.name,
        params.updateScopes,
        params.scopes,
        params.updateExpiresAt,
        params.expiresAt,
      ],
    );

    return tokens[0] ?? null;
  }

  async revokeServiceApiToken(
    apiTokenId: string,
    manager?: EntityManager,
  ): Promise<InternalApiTokenRow | null> {
    const tokens = await this.getManager(manager).query<InternalApiTokenRow[]>(
      `
        UPDATE prism_service_api_tokens_l
        SET revoked_at = COALESCE(revoked_at, NOW()),
            updated_at = NOW()
        WHERE api_token_id = $1
        RETURNING
          api_token_id AS "apiTokenId",
          service_account_id AS "serviceAccountId",
          name,
          token_prefix AS "tokenPrefix",
          token_hash AS "tokenHash",
          scopes,
          expires_at AS "expiresAt",
          last_used_at AS "lastUsedAt",
          revoked_at AS "revokedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [apiTokenId],
    );

    return tokens[0] ?? null;
  }

  async updateServiceApiTokenLastUsedAt(
    apiTokenId: string,
    lastUsedAt: Date,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_service_api_tokens_l
        SET last_used_at = $2,
            updated_at = NOW()
        WHERE api_token_id = $1
      `,
      [apiTokenId, lastUsedAt],
    );
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
