import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateInternalServiceAccountParams,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
  InternalApiTokenWithServiceRow,
  InternalServiceAccountRow,
  PersistInternalApiTokenParams,
} from '@/modules/admin/types';

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
