import { Module } from '@nestjs/common';
import { GithubInstallationController } from '@/modules/github/controller';
import { GithubInstallationRepository } from '@/modules/github/repository';
import { GithubAppService } from '@/modules/github/services';
import { GithubInstallationUseCase } from '@/modules/github/usecases';

@Module({
  controllers: [GithubInstallationController],
  providers: [
    GithubAppService,
    GithubInstallationRepository,
    GithubInstallationUseCase,
  ],
  exports: [GithubAppService, GithubInstallationRepository],
})
export class GithubModule {}
