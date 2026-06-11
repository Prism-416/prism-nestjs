import { Injectable } from '@nestjs/common';
import { AdminUserMetricsRepository } from '@/modules/admin/repository';
import type {
  AdminUserActivitySummary,
  AdminUserMetricsSummary,
  AdminUserSignupTrend,
  GetAdminUserSignupTrendParams,
} from '@/modules/admin/types';

@Injectable()
export class AdminUserMetricsUseCase {
  constructor(private readonly repo: AdminUserMetricsRepository) {}

  getMetricsSummary(): Promise<AdminUserMetricsSummary> {
    return this.repo.getMetricsSummary();
  }

  getSignupTrend(
    params: Partial<GetAdminUserSignupTrendParams>,
  ): Promise<AdminUserSignupTrend> {
    return this.repo.getSignupTrend({
      windowDays: params.windowDays ?? 30,
    });
  }

  getActivitySummary(): Promise<AdminUserActivitySummary> {
    return this.repo.getActivitySummary();
  }
}
