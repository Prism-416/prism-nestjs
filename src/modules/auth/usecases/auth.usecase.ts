import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '@/core/auth';
import { UnitOfWork } from '@/core/database';
import { PasswordService } from '@/core/security';
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
  InvalidRefreshTokenError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  AuthSessionService,
  EmailVerificationService,
  GithubAuthorizationRequestResult,
  GithubTokenVerifierService,
  OAuthIdentityService,
} from '@/modules/auth/services';

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
    private readonly github: GithubTokenVerifierService,
    private readonly oauthIdentity: OAuthIdentityService,
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

  async signInWithGoogle(
    dto: SignInWithGoogleDto,
  ): Promise<OAuthSignInResponseDto> {
    const googleProfile = await this.oauthIdentity.verifyGoogleIdentity(
      dto.idToken,
    );

    return await this.signInWithOAuth('google', googleProfile.subject);
  }

  createGithubSignInAuthorizationRequest(): GithubAuthorizationRequestResult {
    return this.github.createAuthorizationRequest({
      appRedirectUrl: this.getRequiredPageUrl('GITHUB_OAUTH_SIGNIN_PAGE_URL'),
      flow: 'signin',
    });
  }

  async signInWithGithub(
    dto: SignInWithGithubDto,
    cookieHeader?: string,
  ): Promise<OAuthSignInResponseDto> {
    const githubProfile = await this.oauthIdentity.verifyGithubIdentity({
      code: dto.code,
      state: dto.state,
      cookieHeader,
    });

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
        return await this.authSession.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      return { newUser: true };
    });
  }

  private getRequiredPageUrl(key: 'GITHUB_OAUTH_SIGNIN_PAGE_URL'): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }
}
