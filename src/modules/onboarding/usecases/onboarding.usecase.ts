import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnitOfWork } from '@/core/database';
import {
  AuthTokenPairResponseDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  SignUpWithGithubDto,
  SignUpWithGoogleDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';
import {
  InvalidGithubAuthorizationCodeError,
  InvalidGithubOAuthStateError,
  InvalidGoogleIdTokenError,
  UnverifiedGithubEmailError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';
import {
  AuthRegistrationService,
  AuthSessionService,
  EmailVerificationService,
  GithubAuthorizationRequestResult,
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { WorkspaceProvisioningService } from '@/modules/workspace/services';

@Injectable()
export class OnboardingUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configService: ConfigService,
    private readonly authRegistration: AuthRegistrationService,
    private readonly authSession: AuthSessionService,
    private readonly emailVerification: EmailVerificationService,
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
    private readonly workspaceProvisioning: WorkspaceProvisioningService,
  ) {}

  async checkUsername(username: string): Promise<void> {
    return this.uow.run(async (manager) => {
      await this.authRegistration.ensureUsernameAvailable(username, manager);
    });
  }

  async signUpWithEmail(
    dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const { user, authId } = await this.authRegistration.registerEmailUser(
        dto,
        manager,
      );

      await this.emailVerification.issue(user.email, authId, manager);

      return user;
    });
  }

  async signUpWithGoogle(
    dto: SignUpWithGoogleDto,
  ): Promise<AuthTokenPairResponseDto> {
    const googleProfile = await this.verifyGoogleProfile(dto.idToken);

    return await this.signUpWithOAuth({
      provider: 'google',
      providerUserId: googleProfile.subject,
      email: googleProfile.email,
      fullName: dto.fullName,
      username: dto.username,
    });
  }

  async signUpWithGithub(
    dto: SignUpWithGithubDto,
    cookieHeader?: string,
  ): Promise<SignUpWithEmailResponseDto> {
    const githubProfile = await this.verifyGithubProfile(
      dto.code,
      dto.state,
      dto.redirectUri,
      cookieHeader,
    );

    return this.signUpWithOAuth({
      provider: 'github',
      providerUserId: githubProfile.subject,
      email: githubProfile.email,
      fullName: dto.fullName,
      username: dto.username,
    });
  }

  createGithubSignUpAuthorizationRequest(): GithubAuthorizationRequestResult {
    return this.github.createAuthorizationRequest(
      this.getRequiredPageUrl('GITHUB_OAUTH_SIGNUP_PAGE_URL'),
    );
  }

  private async signUpWithOAuth(params: {
    provider: 'google' | 'github';
    providerUserId: string;
    email: string;
    fullName: string;
    username: string;
  }): Promise<AuthTokenPairResponseDto> {
    return this.uow.run(async (manager) => {
      const user = await this.authRegistration.registerOAuthUser(
        params,
        manager,
      );

      await this.workspaceProvisioning.createOwnedWorkspace(
        {
          ownerId: user.userId,
          name: this.buildDefaultWorkspaceName(user.username),
        },
        manager,
      );

      return await this.authSession.issueTokenPair(
        user.userId,
        user.email,
        manager,
      );
    });
  }

  async verifyEmail(tokenPayload: string): Promise<VerifyEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const user = await this.emailVerification.verifyToken(
        tokenPayload,
        manager,
      );

      await this.workspaceProvisioning.ensureOwnedWorkspace(
        {
          ownerId: user.userId,
          name: this.buildDefaultWorkspaceName(user.username),
        },
        manager,
      );

      return { verified: true };
    });
  }

  private async verifyGoogleProfile(idToken: string): Promise<GoogleProfile> {
    let profile: GoogleProfile;

    try {
      profile = await this.google.verify(idToken);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGoogleIdTokenError();
    }

    if (!profile.emailVerified) {
      throw new UnverifiedGoogleEmailError();
    }

    return profile;
  }

  private async verifyGithubProfile(
    code: string,
    state: string,
    redirectUri?: string,
    cookieHeader?: string,
  ): Promise<GithubProfile> {
    let profile: GithubProfile;

    try {
      profile = await this.github.verify({
        code,
        state,
        redirectUri,
        cookieHeader,
      });
    } catch (error) {
      if (error instanceof InvalidGithubOAuthStateError) {
        throw error;
      }

      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGithubAuthorizationCodeError();
    }

    if (!profile.emailVerified) {
      throw new UnverifiedGithubEmailError();
    }

    return profile;
  }

  private buildDefaultWorkspaceName(username: string): string {
    return `${username}'s workspace`;
  }

  private getRequiredPageUrl(key: 'GITHUB_OAUTH_SIGNUP_PAGE_URL'): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }
}
