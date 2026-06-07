import { Module } from '@nestjs/common';
import {
  GithubInstallationController,
  GithubWebhookController,
} from '@/modules/github/controller';
import { GithubInstallationRepository } from '@/modules/github/repository';
import {
  GithubAppService,
  GithubWebhookService,
} from '@/modules/github/services';
import {
  GithubInstallationUseCase,
  GithubWebhookUseCase,
} from '@/modules/github/usecases';

@Module({
  controllers: [GithubInstallationController, GithubWebhookController],
  providers: [
    GithubAppService,
    GithubWebhookService,
    GithubInstallationRepository,
    GithubInstallationUseCase,
    GithubWebhookUseCase,
  ],
  exports: [GithubAppService, GithubInstallationRepository],
})
export class GithubModule {}
