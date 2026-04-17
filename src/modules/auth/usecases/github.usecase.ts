import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GithubOAuthCallbackQueryDto } from '@/modules/auth/dto';
import { GithubTokenVerifierService } from '@/modules/auth/services';

export type GithubOAuthCallbackResult = {
  redirectUrl: string;
  clearTransactionCookie: boolean;
};

@Injectable()
export class GithubOAuthCallbackUseCase {
  private readonly logger = new Logger(GithubOAuthCallbackUseCase.name);

  constructor(private readonly github: GithubTokenVerifierService) {}

  handle(
    query: GithubOAuthCallbackQueryDto,
    cookieHeader?: string,
  ): GithubOAuthCallbackResult {
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

    return {
      redirectUrl: this.buildRedirectUrl(callbackContext.appRedirectUrl, {
        state: query.state,
        code: query.code,
      }),
      clearTransactionCookie: false,
    };
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
}
