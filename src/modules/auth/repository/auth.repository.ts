import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { SignInWithEmailDto, SignUpWithEmailDto } from '@/modules/auth/dto';
import {
  AuthProvider,
  CreatedUserRow,
  EmailAuthCredentialRow,
  EmailVerificationTokenRow,
  OAuthAuthRow,
  OAuthConnectedAccountRow,
  OAuthProvider,
  PasswordResetTokenRow,
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
        SELECT user_id   AS "userId",
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

  async updateUserFullName(
    userId: string,
    fullName: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        UPDATE prism_users_l
        SET full_name = $2
        WHERE user_id = $1
        RETURNING
          user_id AS "userId",
          email,
          full_name AS "fullName",
          username
      `,
      [userId, fullName],
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

  async createDefaultUserPreferences(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_user_preferences_l (
          user_id,
          theme,
          locale,
          timezone,
          email_notifications_enabled
        )
        VALUES ($1, 'system', 'en-US', 'UTC', TRUE)
      `,
      [userId],
    );
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
    provider: OAuthProvider,
    providerUserId: string,
    email: string,
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
        VALUES ($1, $2, $3, $4, NULL)
        RETURNING auth_id AS "authId"
      `,
      [userId, provider, providerUserId, email],
    );
    return auths[0];
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
        SELECT refresh_token_id   AS "refreshTokenId",
               user_id            AS "userId",
               refresh_token_hash AS "refreshTokenHash",
               expires_at         AS "expiresAt",
               revoked_at         AS "revokedAt"
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
        SELECT ua.auth_id                            AS "authId",
               u.user_id                             AS "userId",
               u.email,
               ua.password_hash                      AS "password",
               u.full_name                           AS "fullName",
               u.username,
               ua.is_verified                        AS "isVerified"
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

  async findEmailAuthCredentialByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<EmailAuthCredentialRow | null> {
    const auths = await this.getManager(manager).query<
      EmailAuthCredentialRow[]
    >(
      `
        SELECT auth_id       AS "authId",
               user_id       AS "userId",
               email,
               password_hash AS "password",
               is_verified   AS "isVerified"
        FROM prism_user_auths_l
        WHERE provider = 'email'
          AND email = $1
        LIMIT 1
      `,
      [email],
    );

    return auths[0] ?? null;
  }

  async findEmailAuthCredentialByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<EmailAuthCredentialRow | null> {
    const auths = await this.getManager(manager).query<
      EmailAuthCredentialRow[]
    >(
      `
        SELECT auth_id       AS "authId",
               user_id       AS "userId",
               email,
               password_hash AS "password",
               is_verified   AS "isVerified"
        FROM prism_user_auths_l
        WHERE provider = 'email'
          AND user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return auths[0] ?? null;
  }

  async findEmailAuthCredentialByAuthId(
    authId: string,
    manager?: EntityManager,
  ): Promise<EmailAuthCredentialRow | null> {
    const auths = await this.getManager(manager).query<
      EmailAuthCredentialRow[]
    >(
      `
        SELECT auth_id       AS "authId",
               user_id       AS "userId",
               email,
               password_hash AS "password",
               is_verified   AS "isVerified"
        FROM prism_user_auths_l
        WHERE provider = 'email'
          AND auth_id = $1
        LIMIT 1
      `,
      [authId],
    );

    return auths[0] ?? null;
  }

  async updateEmailAuthPassword(
    authId: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_user_auths_l
        SET password_hash = $2,
            updated_at = NOW()
        WHERE auth_id = $1
          AND provider = 'email'
      `,
      [authId, passwordHash],
    );
  }

  async deleteUnusedEmailTokensByAuthId(
    authId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE
        FROM prism_email_tokens_l
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
        SELECT email_token_id   AS "emailTokenId",
               auth_id          AS "authId",
               email_token_hash AS "emailTokenHash",
               expires_at       AS "expiresAt",
               used_at          AS "usedAt"
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

  async markUserAuthVerified(
    authId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_user_auths_l
        SET is_verified = TRUE
        WHERE auth_id = $1
      `,
      [authId],
    );
  }

  async deleteUnusedPasswordResetTokensByAuthId(
    authId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        DELETE
        FROM prism_password_reset_tokens_l
        WHERE auth_id = $1
          AND used_at IS NULL
      `,
      [authId],
    );
  }

  async createPasswordResetToken(
    authId: string,
    passwordResetTokenHash: string,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_password_reset_tokens_l (
          auth_id,
          password_reset_token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [authId, passwordResetTokenHash, expiresAt],
    );
  }

  async findValidPasswordResetTokenByHash(
    passwordResetTokenHash: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<PasswordResetTokenRow | null> {
    const tokens = await this.getManager(manager).query<
      PasswordResetTokenRow[]
    >(
      `
        SELECT password_reset_token_id   AS "passwordResetTokenId",
               auth_id                   AS "authId",
               password_reset_token_hash AS "passwordResetTokenHash",
               expires_at                AS "expiresAt",
               used_at                   AS "usedAt"
        FROM prism_password_reset_tokens_l
        WHERE password_reset_token_hash = $1
          AND used_at IS NULL
          AND expires_at > $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [passwordResetTokenHash, now],
    );

    return tokens[0] ?? null;
  }

  async markPasswordResetTokenAsUsed(
    passwordResetTokenId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        UPDATE prism_password_reset_tokens_l
        SET used_at = NOW()
        WHERE password_reset_token_id = $1
          AND used_at IS NULL
      `,
      [passwordResetTokenId],
    );
  }

  async findUserByProvider(
    provider: AuthProvider,
    providerUserId: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT u.user_id   AS "userId",
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

  async findOAuthAuthByUserAndProvider(
    userId: string,
    provider: OAuthProvider,
    manager?: EntityManager,
  ): Promise<OAuthAuthRow | null> {
    const auths = await this.getManager(manager).query<OAuthAuthRow[]>(
      `
        SELECT auth_id          AS "authId",
               user_id          AS "userId",
               provider,
               provider_user_id AS "providerUserId",
               email,
               is_verified      AS "isVerified"
        FROM prism_user_auths_l
        WHERE user_id = $1
          AND provider = $2
        LIMIT 1
      `,
      [userId, provider],
    );

    return auths[0] ?? null;
  }

  async findOAuthConnectedAccountsByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<OAuthConnectedAccountRow[]> {
    return await this.getManager(manager).query<OAuthConnectedAccountRow[]>(
      `
        SELECT provider,
               email,
               is_verified AS "isVerified"
        FROM prism_user_auths_l
        WHERE user_id = $1
          AND provider IN ('google', 'github')
        ORDER BY CASE provider
                   WHEN 'google' THEN 1
                   WHEN 'github' THEN 2
                   ELSE 3
                 END
      `,
      [userId],
    );
  }

  async findUserByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT user_id   AS "userId",
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
        SELECT user_id   AS "userId",
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

  async findUserByAuthId(
    authId: string,
    manager?: EntityManager,
  ): Promise<UserProfileRow | null> {
    const users = await this.getManager(manager).query<UserProfileRow[]>(
      `
        SELECT u.user_id      AS "userId",
               u.email,
               u.full_name    AS "fullName",
               u.username,
               ua.is_verified AS "isVerified"
        FROM prism_user_auths_l ua
               INNER JOIN prism_users_l u ON u.user_id = ua.user_id
        WHERE ua.auth_id = $1
        LIMIT 1
      `,
      [authId],
    );

    return users[0] ?? null;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
