import { Injectable } from '@nestjs/common';
import { AdminEmbeddingJobRepository } from '@/modules/admin/repository';
import type {
  AdminEmbeddingJobHealthSummary,
  GetAdminEmbeddingJobHealthSummaryParams,
} from '@/modules/admin/types';

@Injectable()
export class AdminEmbeddingJobUseCase {
  constructor(private readonly repo: AdminEmbeddingJobRepository) {}

  getHealthSummary(
    params: Partial<GetAdminEmbeddingJobHealthSummaryParams>,
  ): Promise<AdminEmbeddingJobHealthSummary> {
    return this.repo.getHealthSummary({
      staleQueuedAfterMinutes: params.staleQueuedAfterMinutes ?? 60,
      staleRunningAfterMinutes: params.staleRunningAfterMinutes ?? 30,
    });
  }
}
