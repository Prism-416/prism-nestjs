import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { SignInWithEmailDto, SignUpWithEmailDto } from '@/modules/auth/dto';
import {
  AuthProvider,
  CreatedUserRow,
  EmailVerificationTokenRow,
  RefreshTokenRow,
  UserCredentialRow,
  UserProfileRow,
} from '@/modules/auth/types';

@Injectable()
export class AuthRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findUserByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT
          user_id AS "userId",
          email,
          full_name AS "fullName",
          username
        FROM prism_users_l
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    return users[0] ?? null;
  }

  async createUser(
    dto: Pick<SignUpWithEmailDto, 'email' | 'fullName' | 'username'>,
    manager?: EntityManager,
  ): Promise<CreatedUserRow> {
    const users = await this.getManager(manager).query<CreatedUserRow[]>(
      `
        INSERT INTO prism_users_l (email, full_name, username)
        VALUES ($1, $2, $3)
        RETURNING
          user_id AS "userId",
          email,
          full_name AS "fullName",
          username,
          created_at AS "createdAt"
      `,
      [dto.email, dto.fullName, dto.username],
    );

    return users[0];
  }

  async createEmailAuth(
    userId: string,
    email: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<{ authId: string }> {
    const auths = await this.getManager(manager).query<{ authId: string }[]>(
      `
        INSERT INTO prism_user_auths_l (
          user_id,
          provider,
          provider_user_id,
          email,
          password_hash
        )
        VALUES ($1, 'email', $2, $2, $3)
        RETURNING auth_id AS "authId"
      `,
      [userId, email, passwordHash],
    );

    return auths[0];
  }

  async createOAuthAuth(
    userId: string,
    provider: Exclude<AuthProvider, 'email'>,
    providerUserId: string,
    email: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_user_auths_l (
          user_id,
          provider,
          provider_user_id,
          email,
          password_hash
        )
        VALUES ($1, $2, $3, $4, NULL)
      `,
      [userId, provider, providerUserId, email],
    );
  }

  async createRefreshToken(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_refresh_tokens_l (
          user_id,
          refresh_token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [userId, refreshTokenHash, expiresAt],
    );
  }

  async findValidRefreshTokenByUserId(
    userId: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<RefreshTokenRow | null> {
    const tokens = await this.getManager(manager).query<RefreshTokenRow[]>(
      `
        SELECT
          refresh_token_id AS "refreshTokenId",
          user_id AS "userId",
          refresh_token_hash AS "refreshTokenHash",
          expires_at AS "expiresAt",
          revoked_at AS "revokedAt"
        FROM prism_refresh_tokens_l
        WHERE user_id = $1
          AND revoked_at IS NULL
          AND expires_at > $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId, now],
    );

    return tokens[0] ?? null;
  }

  async invalidateRefreshToken(
    refreshTokenId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_refresh_tokens_l
        SET revoked_at = NOW()
        WHERE refresh_token_id = $1
          AND revoked_at IS NULL
      `,
      [refreshTokenId],
    );
  }

  async invalidateRefreshTokensByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_refresh_tokens_l
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL
      `,
      [userId],
    );
  }

  async findUserByEmailForSignIn(
    dto: SignInWithEmailDto,
  ): Promise<UserCredentialRow | null> {
    const users = await this.dataSource.query<UserCredentialRow[]>(
      `
        SELECT
          ua.auth_id AS "authId",
          u.user_id AS "userId",
          u.email,
          ua.password_hash AS "password",
          u.full_name AS "fullName",
          u.username,
          EXISTS (
            SELECT 1
            FROM prism_email_tokens_l et
            WHERE et.auth_id = ua.auth_id
              AND et.used_at IS NOT NULL
          ) AS "emailVerified"
        FROM prism_user_auths_l ua
        INNER JOIN prism_users_l u ON u.user_id = ua.user_id
        WHERE ua.provider = 'email'
          AND ua.email = $1
        LIMIT 1
      `,
      [dto.email],
    );

    return users[0] ?? null;
  }

  async findEmailAuthByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<{ authId: string } | null> {
    const auths = await this.getManager(manager).query<{ authId: string }[]>(
      `
        SELECT auth_id AS "authId"
        FROM prism_user_auths_l
        WHERE provider = 'email'
          AND email = $1
        LIMIT 1
      `,
      [email],
    );

    return auths[0] ?? null;
  }

  async deleteUnusedEmailTokensByAuthId(
    authId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE FROM prism_email_tokens_l
        WHERE auth_id = $1
          AND used_at IS NULL
      `,
      [authId],
    );
  }

  async createEmailVerificationToken(
    authId: string,
    emailTokenHash: string,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_email_tokens_l (
          auth_id,
          email_token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [authId, emailTokenHash, expiresAt],
    );
  }

  async findValidEmailVerificationTokenByHash(
    emailTokenHash: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<EmailVerificationTokenRow | null> {
    const tokens = await this.getManager(manager).query<
      EmailVerificationTokenRow[]
    >(
      `
        SELECT
          email_token_id AS "emailTokenId",
          auth_id AS "authId",
          email_token_hash AS "emailTokenHash",
          expires_at AS "expiresAt",
          used_at AS "usedAt"
        FROM prism_email_tokens_l
        WHERE email_token_hash = $1
          AND used_at IS NULL
          AND (expires_at IS NULL OR expires_at > $2)
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [emailTokenHash, now],
    );

    return tokens[0] ?? null;
  }

  async markEmailVerificationTokenAsUsed(
    emailTokenId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_email_tokens_l
        SET used_at = NOW()
        WHERE email_token_id = $1
          AND used_at IS NULL
      `,
      [emailTokenId],
    );
  }

  async findUserByProvider(
    provider: AuthProvider,
    providerUserId: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.email,
          u.full_name AS "fullName",
          u.username
        FROM prism_user_auths_l ua
        INNER JOIN prism_users_l u ON u.user_id = ua.user_id
        WHERE ua.provider = $1
          AND ua.provider_user_id = $2
        LIMIT 1
      `,
      [provider, providerUserId],
    );

    return users[0] ?? null;
  }

  async findUserByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT
          user_id AS "userId",
          email,
          full_name AS "fullName",
          username
        FROM prism_users_l
        WHERE username = $1
        LIMIT 1
      `,
      [username],
    );

    return users[0] ?? null;
  }

  async findUserById(
    userId: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT
          user_id AS "userId",
          email,
          full_name AS "fullName",
          username
        FROM prism_users_l
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return users[0] ?? null;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
