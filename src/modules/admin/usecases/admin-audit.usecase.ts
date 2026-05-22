import { Injectable } from '@nestjs/common';
import { AdminAuditRepository } from '@/modules/admin/repository';
import {
  SearchAdminAuditEventsParams,
  SearchAdminAuditEventsResult,
} from '@/modules/admin/types';

@Injectable()
export class AdminAuditUseCase {
  constructor(private readonly repo: AdminAuditRepository) {}

  searchAuditEvents(
    params: Partial<SearchAdminAuditEventsParams>,
  ): Promise<SearchAdminAuditEventsResult> {
    return this.repo.searchAuditEvents({
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }
}
