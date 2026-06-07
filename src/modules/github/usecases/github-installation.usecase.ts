import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GithubInstallationCallbackQueryDto } from '@/modules/github/dto';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services';

export type GithubInstallationCallbackResult = {
  redirectUrl: string;
};

@Injectable()
export class GithubInstallationUseCase {
  private readonly logger = new Logger(GithubInstallationUseCase.name);

  constructor(
    private readonly github: GithubAppService,
    private readonly repo: GithubInstallationRepository,
  ) {}

  async handleCallback(
    query: GithubInstallationCallbackQueryDto,
  ): Promise<GithubInstallationCallbackResult> {
    const state = this.github.readInstallationState(query.state);

    if (query.error) {
      this.logger.warn(
        `GitHub installation callback returned provider error: ${query.error}${
          query.error_description ? ` - ${query.error_description}` : ''
        }`,
      );

      return {
        redirectUrl: this.github.buildInstallationResultRedirectUrl({
          projectId: state.projectId,
          error: query.error,
          errorDescription: query.error_description,
          errorUri: query.error_uri,
        }),
      };
    }

    if (!query.installation_id) {
      throw new BadRequestException(
        'GitHub installation callback must include installation_id.',
      );
    }

    const installation = await this.github.fetchInstallation(
      query.installation_id,
    );

    await this.repo.upsertInstallation({
      ...installation,
      installedByUserId: state.userId,
    });
    await this.repo.grantInstallationToUser({
      githubInstallationId: installation.githubInstallationId,
      userId: state.userId,
    });

    return {
      redirectUrl: this.github.buildInstallationResultRedirectUrl({
        projectId: state.projectId,
        installationId: query.installation_id,
        setupAction: query.setup_action,
      }),
    };
  }
}
