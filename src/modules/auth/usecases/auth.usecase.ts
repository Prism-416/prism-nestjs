import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { PasswordService } from '@/common/security';
import {
  AuthTokenPairResponseDto,
  OAuthSignInResponseDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  SignInWithEmailDto,
  SignInWithGithubDto,
  SignInWithGoogleDto,
} from '@/modules/auth/dto';
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidGithubAuthorizationCodeError,
  InvalidGoogleIdTokenError,
  InvalidRefreshTokenError,
  UnverifiedGithubEmailError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  EmailVerificationService,
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { EntityManager } from 'typeorm';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly jwtService: JwtTokenService,
    private readonly pwdService: PasswordService,
    private readonly emailVerification: EmailVerificationService,
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
  ) {}

  async signInWithEmail(
    dto: SignInWithEmailDto,
  ): Promise<AuthTokenPairResponseDto> {
    const user = await this.repo.findUserByEmailForSignIn(dto);
    if (!user || !(await this.pwdService.verify(dto.password, user.password))) {
      throw new InvalidCredentialsError();
    }
    if (!user.isVerified) {
      throw new EmailNotVerifiedError();
    }

    return this.uow.run(async (manager) => {
      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async signInWithGoogle(
    dto: SignInWithGoogleDto,
  ): Promise<OAuthSignInResponseDto> {
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

    return await this.signInWithOAuth('google', googleProfile.subject);
  }

  async signInWithGithub(
    dto: SignInWithGithubDto,
  ): Promise<OAuthSignInResponseDto> {
    let githubProfile: GithubProfile;
    try {
      githubProfile = await this.github.verify(dto.code, dto.redirectUri);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGithubAuthorizationCodeError();
    }

    if (!githubProfile.emailVerified) {
      throw new UnverifiedGithubEmailError();
    }

    return await this.signInWithOAuth('github', githubProfile.subject);
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

  async requestEmailVerification(
    dto: RequestEmailVerificationDto,
  ): Promise<RequestEmailVerificationResponseDto> {
    await this.uow.run(async (manager) => {
      const auth = await this.repo.findEmailAuthByEmail(dto.email, manager);
      if (!auth) {
        return;
      }

      await this.emailVerification.issue(dto.email, auth.authId, manager);
    });

    return { requested: true };
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

  private async signInWithOAuth(
    provider: 'google' | 'github',
    providerUserId: string,
  ): Promise<OAuthSignInResponseDto> {
    return this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        provider,
        providerUserId,
        manager,
      );
      if (linkedUser) {
        return this.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      return { newUser: true };
    });
  }
}
