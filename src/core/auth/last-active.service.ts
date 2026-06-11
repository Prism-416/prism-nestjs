import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Records user activity when an authenticated user makes a request: it stamps
 * `prism_users_l.last_active_at` (the live DAU/WAU/MAU snapshot) and appends a
 * per-day row to `prism_user_daily_activity_l` (the historical trend). Writes
 * are throttled in-memory so a busy user triggers at most one persist per
 * throttle window, and the persist runs fire-and-forget so request latency is
 * never affected. Daily granularity is all the activity metrics need, so the
 * default window is comfortably coarse.
 */
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Bounds the throttle map so a long-running process tracking many distinct
 * users cannot grow it without limit. Clearing it only costs a few redundant
 * UPDATEs on the next request from previously seen users.
 */
const MAX_TRACKED_USERS = 50_000;

@Injectable()
export class LastActiveService {
  private readonly lastTouchedAt = new Map<string, number>();

  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  touch(userId: string): void {
    const dataSource = this.dataSource;
    if (!dataSource) {
      return;
    }

    const now = Date.now();
    const previous = this.lastTouchedAt.get(userId);
    if (previous !== undefined && now - previous < TOUCH_THROTTLE_MS) {
      return;
    }

    if (this.lastTouchedAt.size >= MAX_TRACKED_USERS) {
      this.lastTouchedAt.clear();
    }
    this.lastTouchedAt.set(userId, now);

    void this.persist(dataSource, userId);
  }

  private async persist(dataSource: DataSource, userId: string): Promise<void> {
    try {
      // Single round-trip: stamp the live snapshot and append today's activity
      // row. The insert is keyed off the just-touched user, so a missing user
      // writes nothing, and the daily PK makes repeat touches idempotent.
      await dataSource.query(
        `
          WITH touched AS (
            UPDATE prism_users_l
            SET last_active_at = NOW()
            WHERE user_id = $1
            RETURNING user_id
          )
          INSERT INTO prism_user_daily_activity_l (user_id, activity_date)
          SELECT user_id, CURRENT_DATE
          FROM touched
          ON CONFLICT (user_id, activity_date) DO NOTHING
        `,
        [userId],
      );
    } catch {
      // Best-effort tracking: drop the throttle entry so the next request can
      // retry, and never surface the failure to the caller.
      this.lastTouchedAt.delete(userId);
    }
  }
}
