import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { PasswordService } from '@/common/security';
import {
  AuthTokenPairResponseDto,
  SignInWithGoogleDto,
  SignInWithEmailDto,
  SignUpWithEmailDto,
} from '@/modules/auth/dto';
import {
  EmailAlreadyExistsError,
  InvalidGoogleIdTokenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  GoogleProfile,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly jwtService: JwtTokenService,
    private readonly pwdService: PasswordService,
    private readonly google: GoogleTokenVerifierService,
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

  async signInWithGoogle(
    dto: SignInWithGoogleDto,
  ): Promise<AuthTokenPairResponseDto> {
    let googleProfile: GoogleProfile;
    try {
      googleProfile = await this.google.verify(dto.idToken);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGoogleIdTokenError();
    }

    if (!googleProfile.emailVerified) {
      throw new UnverifiedGoogleEmailError();
    }

    return this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        'google',
        googleProfile.subject,
        manager,
      );
      if (linkedUser) {
        return this.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      let user = await this.repo.findUserByEmail(googleProfile.email, manager);
      if (!user) {
        const username = await this.generateUniqueUsername(
          googleProfile.email,
          googleProfile.fullName,
          manager,
        );
        user = await this.repo.createUser(
          {
            email: googleProfile.email,
            fullName: googleProfile.fullName,
            username,
          },
          manager,
        );
      }

      await this.repo.createOAuthAuth(
        user.userId,
        'google',
        googleProfile.subject,
        googleProfile.email,
        manager,
      );

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

  private async generateUniqueUsername(
    email: string,
    fullName: string,
    manager: EntityManager,
  ): Promise<string> {
    const seeds = [
      this.normalizeUsername(fullName),
      this.normalizeUsername(email.split('@')[0] ?? ''),
      'user',
    ].filter(Boolean);

    for (const seed of seeds) {
      const existingUser = await this.repo.findUserByUsername(seed, manager);
      if (!existingUser) {
        return seed;
      }
    }

    const base = seeds[0] ?? 'user';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${base}${randomInt(1000, 9999)}`.slice(0, 30);
      const existingUser = await this.repo.findUserByUsername(
        candidate,
        manager,
      );
      if (!existingUser) {
        return candidate;
      }
    }

    return `user${Date.now().toString().slice(-8)}`.slice(0, 30);
  }

  private normalizeUsername(value: string): string {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);

    if (normalized.length >= 2) {
      return normalized;
    }

    if (normalized.length === 1) {
      return `${normalized}_user`.slice(0, 30);
    }

    return '';
  }
}
