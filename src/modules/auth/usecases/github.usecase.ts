import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DomainError } from '@/core/errors/domain-error';
import {
  GithubOAuthCallbackQueryDto,
  RefreshTokenResponseDto,
} from '@/modules/auth/dto';
import {
  GithubTokenVerifierService,
  OAuthIdentityService,
  OAuthRegistrationService,
} from '@/modules/auth/services';
import { GithubProfile } from '@/modules/auth/types';
import { buildUsernameSeeds, normalizeUsername } from '@/modules/auth/utils';

export type GithubOAuthCallbackResult = {
  redirectUrl: string;
  refreshToken?: string;
  clearTransactionCookie: boolean;
};

@Injectable()
export class GithubOAuthCallbackUseCase {
  private readonly logger = new Logger(GithubOAuthCallbackUseCase.name);

  constructor(
    private readonly github: GithubTokenVerifierService,
    private readonly oauthIdentity: OAuthIdentityService,
    private readonly oauthRegistration: OAuthRegistrationService,
  ) {}

  async handle(
    query: GithubOAuthCallbackQueryDto,
    cookieHeader?: string,
  ): Promise<GithubOAuthCallbackResult> {
    const callbackContext = this.github.readCallbackContext({
      state: query.state,
      cookieHeader,
    });

    if (query.error) {
      this.logger.warn(
        `GitHub callback returned provider error: ${query.error}${query.error_description ? ` - ${query.error_description}` : ''}`,
      );

      return {
        redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
          error: query.error,
          ...(query.error_description
            ? { error_description: query.error_description }
            : {}),
          ...(query.error_uri ? { error_uri: query.error_uri } : {}),
        }),
        clearTransactionCookie: true,
      };
    }

    if (!query.code) {
      throw new BadRequestException(
        'GitHub callback must include code or error',
      );
    }

    if (callbackContext.flow === 'signin') {
      return {
        redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
          state: query.state,
          code: query.code,
        }),
        clearTransactionCookie: false,
      };
    }

    try {
      const tokens = await this.completeGithubSignUp(
        query.code,
        query.state,
        cookieHeader,
      );

      return {
        redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
          status: 'success',
          provider: 'github',
        }),
        refreshToken: tokens.refreshToken,
        clearTransactionCookie: true,
      };
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.warn(
          `GitHub signup callback failed with domain error ${error.code}: ${error.message}`,
        );

        return {
          redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
            error: error.code,
            error_description: error.message,
          }),
          clearTransactionCookie: true,
        };
      }

      if (error instanceof HttpException) {
        const response = error.getResponse();
        const message =
          typeof response === 'string'
            ? response
            : this.extractErrorMessage(response);

        this.logger.warn(`GitHub signup callback failed: ${message}`);

        return {
          redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
            error: 'GITHUB_SIGNUP_FAILED',
            error_description: message,
          }),
          clearTransactionCookie: true,
        };
      }

      throw error;
    }
  }

  private async completeGithubSignUp(
    code: string,
    state: string,
    cookieHeader?: string,
  ): Promise<RefreshTokenResponseDto> {
    const githubProfile = await this.oauthIdentity.verifyGithubIdentity({
      code,
      state,
      cookieHeader,
    });

    return await this.oauthRegistration.registerAndIssueRefreshToken({
      provider: 'github',
      providerUserId: githubProfile.subject,
      email: githubProfile.email,
      fullName: githubProfile.fullName,
      usernameSeeds: this.buildGithubUsernameSeeds(githubProfile),
    });
  }

  private buildRedirectUrl(
    baseUrl: string,
    params: Record<string, string>,
  ): string {
    const redirectUrl = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
      redirectUrl.searchParams.set(key, value);
    }

    return redirectUrl.toString();
  }

  private extractErrorMessage(response: unknown): string {
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const { message } = response as { message?: unknown };

      if (Array.isArray(message)) {
        return message.join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return 'GitHub signup failed.';
  }

  private buildGithubUsernameSeeds(profile: GithubProfile): string[] {
    return [
      normalizeUsername(profile.login ?? ''),
      ...buildUsernameSeeds(profile.fullName, profile.email),
      normalizeUsername(`github_${profile.subject}`),
    ].filter(Boolean);
  }
}
