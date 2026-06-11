import { Module } from '@nestjs/common';
import { AgentRepository } from '@/modules/agent/repository';
import { AgentDispatchService } from '@/modules/agent/services';
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
import {
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';

@Module({
  controllers: [GithubInstallationController, GithubWebhookController],
  providers: [
    AgentDispatchService,
    AgentRepository,
    GithubAppService,
    GithubWebhookService,
    GithubInstallationRepository,
    GithubInstallationUseCase,
    GithubWebhookUseCase,
    ProjectRepository,
    WorkItemRepository,
  ],
  exports: [GithubAppService, GithubInstallationRepository],
})
export class GithubModule {}
