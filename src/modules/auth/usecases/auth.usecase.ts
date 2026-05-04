import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '@/core/auth';
import { UnitOfWork } from '@/core/database';
import { PasswordService } from '@/core/security';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
  AuthMeResponseDto,
  AuthTokenPairResponseDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  RequestPasswordResetDto,
  RequestPasswordResetResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  SignInWithEmailDto,
  SignInWithGithubDto,
  SignInWithGoogleDto,
} from '@/modules/auth/dto';
import {
  EmailNotVerifiedError,
  InvalidCurrentPasswordError,
  InvalidAccessTokenUserError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  AuthSessionService,
  EmailVerificationService,
  GithubAuthorizationRequestResult,
  GithubTokenVerifierService,
  OAuthIdentityService,
  OAuthRegistrationService,
  PasswordResetService,
} from '@/modules/auth/services';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';
import { buildUsernameSeeds, normalizeUsername } from '@/modules/auth/utils';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtTokenService,
    private readonly pwdService: PasswordService,
    private readonly authSession: AuthSessionService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    private readonly github: GithubTokenVerifierService,
    private readonly oauthIdentity: OAuthIdentityService,
    private readonly oauthRegistration: OAuthRegistrationService,
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
      return await this.authSession.issueTokenPair(
        user.userId,
        user.email,
        manager,
      );
    });
  }

  async getMe(userId: string): Promise<AuthMeResponseDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new InvalidAccessTokenUserError();
    }

    return {
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
      },
    };
  }

  async signInWithGoogle(
    dto: SignInWithGoogleDto,
  ): Promise<AuthTokenPairResponseDto> {
    const googleProfile = await this.oauthIdentity.verifyGoogleIdentity(
      dto.idToken,
    );

    return await this.oauthRegistration.signInOrRegisterAndIssueTokenPair({
      provider: 'google',
      providerUserId: googleProfile.subject,
      email: googleProfile.email,
      fullName: googleProfile.fullName,
      usernameSeeds: this.buildGoogleUsernameSeeds(googleProfile),
    });
  }

  createGithubSignInAuthorizationRequest(): GithubAuthorizationRequestResult {
    return this.github.createAuthorizationRequest({
      appRedirectUrl: this.getRequiredPageUrl('GITHUB_OAUTH_SIGNIN_PAGE_URL'),
    });
  }

  async signInWithGithub(
    dto: SignInWithGithubDto,
    cookieHeader?: string,
  ): Promise<AuthTokenPairResponseDto> {
    const githubProfile = await this.oauthIdentity.verifyGithubIdentity({
      code: dto.code,
      state: dto.state,
      cookieHeader,
    });

    return await this.oauthRegistration.signInOrRegisterAndIssueTokenPair({
      provider: 'github',
      providerUserId: githubProfile.subject,
      email: githubProfile.email,
      fullName: githubProfile.fullName,
      usernameSeeds: this.buildGithubUsernameSeeds(githubProfile),
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

      return await this.authSession.issueTokenPair(
        user.userId,
        user.email,
        manager,
      );
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

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<RequestPasswordResetResponseDto> {
    await this.uow.run(async (manager) => {
      const auth = await this.repo.findEmailAuthCredentialByEmail(
        dto.email,
        manager,
      );
      if (!auth) {
        return;
      }

      await this.passwordReset.issue(auth.email, auth.authId, manager);
    });

    return { requested: true };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    await this.uow.run(async (manager) => {
      await this.passwordReset.resetPassword(
        dto.token,
        dto.newPassword,
        manager,
      );
    });

    return { reset: true };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return await this.uow.run(async (manager) => {
      const auth = await this.repo.findEmailAuthCredentialByUserId(
        userId,
        manager,
      );
      if (
        !auth ||
        !(await this.pwdService.verify(dto.currentPassword, auth.password))
      ) {
        throw new InvalidCurrentPasswordError();
      }

      const passwordHash = await this.pwdService.hash(dto.newPassword);
      await this.repo.updateEmailAuthPassword(
        auth.authId,
        passwordHash,
        manager,
      );
      await this.repo.invalidateRefreshTokensByUserId(userId, manager);

      return { changed: true };
    });
  }

  private getRequiredPageUrl(key: 'GITHUB_OAUTH_SIGNIN_PAGE_URL'): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }

  private buildGoogleUsernameSeeds(profile: GoogleProfile): string[] {
    return [
      ...buildUsernameSeeds(profile.fullName, profile.email),
      normalizeUsername(`google_${profile.subject}`),
    ].filter(Boolean);
  }

  private buildGithubUsernameSeeds(profile: GithubProfile): string[] {
    return [
      normalizeUsername(profile.login ?? ''),
      ...buildUsernameSeeds(profile.fullName, profile.email),
      normalizeUsername(`github_${profile.subject}`),
    ].filter(Boolean);
  }
}
