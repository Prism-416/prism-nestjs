import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UnitOfWork } from '@/common/database';
import {
  SignUpWithEmailResponseDto,
  SignUpWithGithubDto,
  SignUpWithGoogleDto,
} from '@/modules/auth/dto';
import {
  InvalidGithubAuthorizationCodeError,
  InvalidGoogleIdTokenError,
  UnverifiedGithubEmailError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';
import {
  AuthRegistrationService,
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly authRegistration: AuthRegistrationService,
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
  ) {}

  async checkUsername(username: string) {
    return this.uow.run(async (manager) => {
      await this.authRegistration.ensureUsernameAvailable(username, manager);
    });
  }

  async signUpWithGoogle(
    dto: SignUpWithGoogleDto,
  ): Promise<SignUpWithEmailResponseDto> {
    const googleProfile = await this.verifyGoogleProfile(dto.idToken);

    return this.signUpWithOAuth({
      provider: 'google',
      providerUserId: googleProfile.subject,
      email: googleProfile.email,
      fullName: dto.fullName,
      username: dto.username,
    });
  }

  async signUpWithGithub(
    dto: SignUpWithGithubDto,
  ): Promise<SignUpWithEmailResponseDto> {
    const githubProfile = await this.verifyGithubProfile(
      dto.code,
      dto.redirectUri,
    );

    return this.signUpWithOAuth({
      provider: 'github',
      providerUserId: githubProfile.subject,
      email: githubProfile.email,
      fullName: dto.fullName,
      username: dto.username,
    });
  }

  private async signUpWithOAuth(params: {
    provider: 'google' | 'github';
    providerUserId: string;
    email: string;
    fullName: string;
    username: string;
  }): Promise<SignUpWithEmailResponseDto> {
    return this.uow.run(async (manager) => {
      return this.authRegistration.registerOAuthUser(params, manager);
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
    redirectUri?: string,
  ): Promise<GithubProfile> {
    let profile: GithubProfile;

    try {
      profile = await this.github.verify(code, redirectUri);
    } catch (error) {
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
}
