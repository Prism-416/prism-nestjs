import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SignInWithEmailDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
} from '@/modules/auth/dto';

type UserCredentialRow = {
  userId: string;
  email: string;
  password: string;
  fullName: string;
  username: string;
};

type UserProfileRow = Omit<UserCredentialRow, 'password'>;

type RefreshTokenRow = {
  refreshTokenId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

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
          display_name AS "username"
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
  ): Promise<SignUpWithEmailResponseDto> {
    const users = await this.getManager(manager).query<
      SignUpWithEmailResponseDto[]
    >(
      `
        INSERT INTO prism_users_l (email, full_name, display_name)
        VALUES ($1, $2, $3)
        RETURNING
          user_id AS "userId",
          email,
          full_name AS "fullName",
          display_name AS "username",
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
        VALUES ($1, 'email', $2, $2, $3)
      `,
      [userId, email, passwordHash],
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
          u.user_id AS "userId",
          u.email,
          ua.password_hash AS "password",
          u.full_name AS "fullName",
          u.display_name AS "username"
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
          display_name AS "username"
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
