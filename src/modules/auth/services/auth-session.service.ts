import { Injectable } from '@nestjs/common';
import { JwtTokenService } from '@/core/auth';
import { PasswordService } from '@/core/security';
import {
  AuthTokenPairResponseDto,
  AuthTokenResponseDto,
  RefreshTokenResponseDto,
} from '@/modules/auth/dto';
import { AuthRepository } from '@/modules/auth/repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtTokenService,
    private readonly passwordService: PasswordService,
  ) {}

  async issueTokenPair(
    userId: string,
    email: string,
    manager: EntityManager,
  ): Promise<AuthTokenPairResponseDto> {
    const accessToken = this.jwtService.createAccessToken(userId, { email });
    const refreshToken = await this.persistRefreshToken(userId, email, manager);

    return {
      accessToken,
      refreshToken,
    };
  }

  async issueRefreshToken(
    userId: string,
    email: string,
    manager: EntityManager,
  ): Promise<RefreshTokenResponseDto> {
    const refreshToken = await this.persistRefreshToken(userId, email, manager);

    return { refreshToken };
  }

  /**
   * Issues a fresh access token without touching the refresh token. Used on refresh:
   * the refresh token is not rotated, so concurrent refreshes simply hand out new
   * access tokens against the same stored token and never conflict.
   */
  issueAccessToken(userId: string, email: string): AuthTokenResponseDto {
    return {
      accessToken: this.jwtService.createAccessToken(userId, { email }),
    };
  }

  private async persistRefreshToken(
    userId: string,
    email: string,
    manager: EntityManager,
  ): Promise<string> {
    const refreshToken = this.jwtService.createRefreshToken(userId, { email });
    const refreshTokenHash = await this.passwordService.hash(refreshToken);
    const refreshPayload = this.jwtService.verifyRefreshToken(refreshToken);

    await this.repo.invalidateRefreshTokensByUserId(userId, manager);
    await this.repo.createRefreshToken(
      userId,
      refreshTokenHash,
      new Date(refreshPayload.exp * 1000),
      manager,
    );

    return refreshToken;
  }
}
