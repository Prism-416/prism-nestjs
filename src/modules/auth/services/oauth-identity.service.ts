import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  InvalidGithubAuthorizationCodeError,
  InvalidGithubOAuthStateError,
  InvalidGoogleIdTokenError,
  UnverifiedGithubEmailError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { GithubTokenVerifierService } from '@/modules/auth/services/github-token-verifier.service';
import { GoogleTokenVerifierService } from '@/modules/auth/services/google-token-verifier.service';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';

@Injectable()
export class OAuthIdentityService {
  constructor(
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
  ) {}

  async verifyGoogleIdentity(idToken: string): Promise<GoogleProfile> {
    let profile: GoogleProfile;

    try {
      profile = await this.google.verify(idToken);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InvalidGoogleIdTokenError();
    }

    if (!profile.emailVerified) {
      throw new UnverifiedGoogleEmailError();
    }

    return profile;
  }

  async verifyGithubIdentity(params: {
    code: string;
    state: string;
    cookieHeader?: string;
  }): Promise<GithubProfile> {
    let profile: GithubProfile;

    try {
      profile = await this.github.verify(params);
    } catch (error) {
      if (
        error instanceof InvalidGithubOAuthStateError ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      if (error instanceof UnauthorizedException) {
        throw new InvalidGithubAuthorizationCodeError();
      }

      throw error;
    }

    if (!profile.emailVerified) {
      throw new UnverifiedGithubEmailError();
    }

    return profile;
  }
}
