import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GithubWebhookResponseDto } from '@/modules/github/dto';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services/github-app.service';
import { GithubWebhookService } from '@/modules/github/services/github-webhook.service';

type GithubWebhookPayload = Record<string, unknown>;

type HandleGithubWebhookParams = {
  event: string;
  deliveryId?: string;
  signature?: string;
  rawBody: Buffer;
  payload: unknown;
};

@Injectable()
export class GithubWebhookUseCase {
  private readonly logger = new Logger(GithubWebhookUseCase.name);

  constructor(
    private readonly github: GithubAppService,
    private readonly webhooks: GithubWebhookService,
    private readonly installations: GithubInstallationRepository,
  ) {}

  async handleWebhook(
    params: HandleGithubWebhookParams,
  ): Promise<GithubWebhookResponseDto> {
    this.webhooks.verifySignature(params.rawBody, params.signature);

    const payload = this.getPayloadRecord(params.payload);
    const action = this.getOptionalString(payload.action);
    let ignored = false;

    switch (params.event) {
      case 'ping':
        await this.handlePing(payload);
        break;
      case 'installation':
        await this.handleInstallation(action, payload);
        break;
      case 'installation_repositories':
        await this.handleInstallationRepositories(payload);
        break;
      default:
        ignored = true;
        this.logger.debug(
          `Ignored GitHub webhook event=${params.event} delivery=${params.deliveryId ?? 'unknown'}`,
        );
    }

    return {
      accepted: true,
      event: params.event,
      action,
      ignored,
    };
  }

  private async handlePing(payload: GithubWebhookPayload): Promise<void> {
    const installation = payload.installation;

    if (!installation) {
      return;
    }

    await this.installations.upsertInstallation({
      ...this.github.mapWebhookInstallation(installation),
      installedByUserId: null,
    });
  }

  private async handleInstallation(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.getInstallationId(payload.installation);

    if (action === 'deleted') {
      await this.installations.markInstallationDeleted(installationId);
      return;
    }

    await this.installations.upsertInstallation({
      ...this.github.mapWebhookInstallation(payload.installation),
      installedByUserId: null,
    });
  }

  private async handleInstallationRepositories(
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installation = this.github.mapWebhookInstallation(
      payload.installation,
    );

    await this.installations.upsertInstallation({
      ...installation,
      installedByUserId: null,
    });

    await this.installations.deleteWorkspaceRepositoryLinksByInstallationRepositories(
      {
        githubInstallationId: installation.githubInstallationId,
        githubRepositoryIds: this.getRepositoryIds(
          payload.repositories_removed,
        ),
      },
    );
  }

  private getPayloadRecord(payload: unknown): GithubWebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Invalid GitHub webhook payload.');
    }

    return payload as GithubWebhookPayload;
  }

  private getInstallationId(installation: unknown): string {
    if (!installation || typeof installation !== 'object') {
      throw new BadRequestException('Invalid GitHub installation payload.');
    }

    const { id } = installation as { id?: unknown };
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new BadRequestException('Invalid GitHub installation id.');
    }

    return String(id);
  }

  private getRepositoryIds(repositories: unknown): string[] {
    if (!Array.isArray(repositories)) {
      return [];
    }

    return repositories
      .map((repository) => {
        if (!repository || typeof repository !== 'object') {
          return null;
        }

        const { id } = repository as { id?: unknown };

        if (typeof id !== 'string' && typeof id !== 'number') {
          return null;
        }

        return String(id);
      })
      .filter((id): id is string => Boolean(id));
  }

  private getOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
