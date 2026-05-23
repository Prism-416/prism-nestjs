import { Injectable } from '@nestjs/common';
import { AdminEmbeddingCoverageRepository } from '@/modules/admin/repository';
import type { AdminEmbeddingCoverageSummary } from '@/modules/admin/types';

@Injectable()
export class AdminEmbeddingCoverageUseCase {
  constructor(private readonly repo: AdminEmbeddingCoverageRepository) {}

  getCoverageSummary(): Promise<AdminEmbeddingCoverageSummary> {
    return this.repo.getCoverageSummary();
  }
}
