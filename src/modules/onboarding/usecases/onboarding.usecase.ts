import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnitOfWork } from '@/core/database';
import {
  AuthTokenPairResponseDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  SignUpWithGoogleDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';
import { GoogleProfile } from '@/modules/auth/types';
import {
  AuthRegistrationService,
  EmailVerificationService,
  GithubAuthorizationRequestResult,
  GithubTokenVerifierService,
  OAuthIdentityService,
  OAuthRegistrationService,
} from '@/modules/auth/services';
import { buildUsernameSeeds, normalizeUsername } from '@/modules/auth/utils';
import { WorkspaceProvisioningService } from '@/modules/workspace/services';

@Injectable()
export class OnboardingUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configService: ConfigService,
    private readonly authRegistration: AuthRegistrationService,
    private readonly emailVerification: EmailVerificationService,
    private readonly github: GithubTokenVerifierService,
    private readonly oauthIdentity: OAuthIdentityService,
    private readonly oauthRegistration: OAuthRegistrationService,
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
    const googleProfile = await this.oauthIdentity.verifyGoogleIdentity(
      dto.idToken,
    );

    return await this.oauthRegistration.registerAndIssueSession({
      provider: 'google',
      providerUserId: googleProfile.subject,
      email: googleProfile.email,
      fullName: googleProfile.fullName,
      usernameSeeds: this.buildGoogleUsernameSeeds(googleProfile),
    });
  }

  createGithubSignUpAuthorizationRequest(): GithubAuthorizationRequestResult {
    return this.github.createAuthorizationRequest({
      appRedirectUrl: this.getRequiredPageUrl('GITHUB_OAUTH_SIGNUP_PAGE_URL'),
      flow: 'signup',
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

  private buildDefaultWorkspaceName(username: string): string {
    return `${username}'s workspace`;
  }

  private buildGoogleUsernameSeeds(profile: GoogleProfile): string[] {
    return [
      ...buildUsernameSeeds(profile.fullName, profile.email),
      normalizeUsername(`google_${profile.subject}`),
    ].filter(Boolean);
  }

  private getRequiredPageUrl(key: 'GITHUB_OAUTH_SIGNUP_PAGE_URL'): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }
}
