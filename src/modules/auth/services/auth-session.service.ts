import { Injectable } from '@nestjs/common';
import { JwtTokenService } from '@/core/auth';
import { PasswordService } from '@/core/security';
import { AuthTokenPairResponseDto } from '@/modules/auth/dto';
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

    return {
      accessToken,
      refreshToken,
    };
  }
}
