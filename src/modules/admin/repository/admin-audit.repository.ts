import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  AdminAuditEventRow,
  CreateAdminAuditEventParams,
  SearchAdminAuditEventsParams,
  SearchAdminAuditEventsResult,
} from '@/modules/admin/types';

type CountRow = {
  total: string | number;
};

@Injectable()
export class AdminAuditRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createAuditEvent(
    params: CreateAdminAuditEventParams,
    manager?: EntityManager,
  ): Promise<AdminAuditEventRow> {
    const events = await this.getManager(manager).query<AdminAuditEventRow[]>(
      `
        INSERT INTO prism_admin_audit_events_l (
          actor_type,
          actor_id,
          action,
          target_type,
          target_id,
          target_name,
          request_id,
          reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          audit_event_id AS "auditEventId",
          actor_type AS "actorType",
          actor_id AS "actorId",
          action,
          target_type AS "targetType",
          target_id AS "targetId",
          target_name AS "targetName",
          request_id AS "requestId",
          reason,
          created_at AS "createdAt"
      `,
      [
        params.actorType,
        params.actorId ?? null,
        params.action,
        params.targetType,
        params.targetId ?? null,
        params.targetName ?? null,
        params.requestId ?? null,
        params.reason ?? null,
      ],
    );

    return events[0];
  }

  async searchAuditEvents(
    params: SearchAdminAuditEventsParams,
    manager?: EntityManager,
  ): Promise<SearchAdminAuditEventsResult> {
    const queryParams = [
      params.action ?? null,
      params.targetType ?? null,
      params.targetId ?? null,
    ];
    const [items, counts] = await Promise.all([
      this.getManager(manager).query<AdminAuditEventRow[]>(
        `
          SELECT
            audit_event_id AS "auditEventId",
            actor_type AS "actorType",
            actor_id AS "actorId",
            action,
            target_type AS "targetType",
            target_id AS "targetId",
            target_name AS "targetName",
            request_id AS "requestId",
            reason,
            created_at AS "createdAt"
          FROM prism_admin_audit_events_l
          WHERE ($1::TEXT IS NULL OR action = $1)
            AND ($2::TEXT IS NULL OR target_type = $2)
            AND ($3::TEXT IS NULL OR target_id = $3)
          ORDER BY created_at DESC, audit_event_id DESC
          LIMIT $4
          OFFSET $5
        `,
        [...queryParams, params.limit, params.offset],
      ),
      this.getManager(manager).query<CountRow[]>(
        `
          SELECT COUNT(*) AS total
          FROM prism_admin_audit_events_l
          WHERE ($1::TEXT IS NULL OR action = $1)
            AND ($2::TEXT IS NULL OR target_type = $2)
            AND ($3::TEXT IS NULL OR target_id = $3)
        `,
        queryParams,
      ),
    ]);

    return {
      items,
      total: Number(counts[0]?.total ?? 0),
      limit: params.limit,
      offset: params.offset,
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
