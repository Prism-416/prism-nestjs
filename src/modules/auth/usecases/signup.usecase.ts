import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UnitOfWork } from '@/common/database';
import { AuthRepository } from '@/modules/auth/repository';
import {
  EmailAlreadyExistsError,
  InvalidGithubAuthorizationCodeError,
  InvalidGoogleIdTokenError,
  UnverifiedGoogleEmailError,
  UnverifiedGithubEmailError,
  UsernameAlreadyExistsError,
} from '@/modules/auth/errors';
import {
  SignUpWithEmailResponseDto,
  SignUpWithGithubDto,
  SignUpWithGoogleDto,
} from '@/modules/auth/dto';
import {
  AuthProvider,
  GithubProfile,
  GoogleProfile,
} from '@/modules/auth/types';
import {
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
  ) {}

  async checkUsername(username: string) {
    return this.uow.run(async (manager) => {
      const user = await this.repo.findUserByUsername(username, manager);
      if (user) {
        throw new UsernameAlreadyExistsError();
      }
    });
  }

  async signUpWithGoogle(
    dto: SignUpWithGoogleDto,
  ): Promise<SignUpWithEmailResponseDto> {
    const googleProfile = await this.verifyGoogleProfile(dto.idToken);

    return await this.signUpWithOAuth(
      'google',
      googleProfile.subject,
      googleProfile.email,
      dto.fullName,
      dto.username,
    );
  }

  async signUpWithGithub(
    dto: SignUpWithGithubDto,
  ): Promise<SignUpWithEmailResponseDto> {
    const githubProfile = await this.verifyGithubProfile(
      dto.code,
      dto.redirectUri,
    );

    return await this.signUpWithOAuth(
      'github',
      githubProfile.subject,
      githubProfile.email,
      dto.fullName,
      dto.username,
    );
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

  private async signUpWithOAuth(
    provider: Exclude<AuthProvider, 'email'>,
    providerUserId: string,
    email: string,
    fullName: string,
    username: string,
  ): Promise<SignUpWithEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        provider,
        providerUserId,
        manager,
      );
      if (linkedUser) {
        throw new EmailAlreadyExistsError();
      }

      const existingUser = await this.repo.findUserByEmail(email, manager);
      if (existingUser) {
        throw new EmailAlreadyExistsError();
      }

      const existingUsername = await this.repo.findUserByUsername(
        username,
        manager,
      );
      if (existingUsername) {
        throw new UsernameAlreadyExistsError();
      }

      const user = await this.repo.createUser(
        {
          email,
          fullName,
          username,
        },
        manager,
      );
      const auth = await this.repo.createOAuthAuth(
        user.userId,
        provider,
        providerUserId,
        email,
        manager,
      );

      await this.repo.markUserAuthVerified(auth.authId, manager);

      return user;
    });
  }
}
