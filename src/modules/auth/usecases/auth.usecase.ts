import { Injectable } from '@nestjs/common';
import { JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { PasswordService } from '@/common/security';
import {
  AuthTokenPairResponseDto,
  SignInWithEmailDto,
  SignUpWithEmailDto,
} from '@/modules/auth/dto';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly jwtService: JwtTokenService,
    private readonly pwdService: PasswordService,
  ) {}

  async signUpWithEmail(dto: SignUpWithEmailDto) {
    const passwordHash = await this.pwdService.hash(dto.password);

    return this.uow.run(async (manager) => {
      const existingUser = await this.repo.findUserByEmail(dto.email, manager);
      if (existingUser) {
        throw new EmailAlreadyExistsError();
      }

      const user = await this.repo.createUser(
        {
          email: dto.email,
          fullName: dto.fullName,
          username: dto.username,
        },
        manager,
      );

      await this.repo.createEmailAuth(
        user.userId,
        dto.email,
        passwordHash,
        manager,
      );

      return user;
    });
  }

  async signInWithEmail(
    dto: SignInWithEmailDto,
  ): Promise<AuthTokenPairResponseDto> {
    const user = await this.repo.findUserByEmailForSignIn(dto);
    if (!user || !(await this.pwdService.verify(dto.password, user.password))) {
      throw new InvalidCredentialsError();
    }

    return this.uow.run(async (manager) => {
      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokenPairResponseDto> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const userId = String(payload.sub);

    return this.uow.run(async (manager) => {
      const user = await this.repo.findUserById(userId, manager);
      if (!user) {
        throw new InvalidRefreshTokenError();
      }

      const storedRefreshToken = await this.repo.findValidRefreshTokenByUserId(
        userId,
        new Date(),
        manager,
      );
      if (
        !storedRefreshToken ||
        !(await this.pwdService.verify(
          refreshToken,
          storedRefreshToken.refreshTokenHash,
        ))
      ) {
        throw new InvalidRefreshTokenError();
      }

      await this.repo.invalidateRefreshToken(
        storedRefreshToken.refreshTokenId,
        manager,
      );

      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const userId = String(payload.sub);

    await this.uow.run(async (manager) => {
      await this.repo.invalidateRefreshTokensByUserId(userId, manager);
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    manager: EntityManager,
  ): Promise<AuthTokenPairResponseDto> {
    const accessToken = this.jwtService.createAccessToken(userId, { email });
    const refreshToken = this.jwtService.createRefreshToken(userId, { email });
    const refreshTokenHash = await this.pwdService.hash(refreshToken);
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
