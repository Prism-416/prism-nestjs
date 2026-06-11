import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type {
  AdminUserActiveTrend,
  AdminUserActivitySummary,
  AdminUserMetricsSummary,
  AdminUserSignupTrend,
  GetAdminUserActiveTrendParams,
  GetAdminUserSignupTrendParams,
} from '@/modules/admin/types';

type AdminUserMetricsSummaryRow = {
  generatedAt: Date;
  totalUsers: string | number;
  verifiedUsers: string | number;
  unverifiedUsers: string | number;
  usersWithEmailAuth: string | number;
  usersWithGoogleAuth: string | number;
  usersWithGithubAuth: string | number;
  usersWithOauthAuth: string | number;
  usersWithActiveSession: string | number;
  usersInWorkspace: string | number;
  usersWithoutWorkspace: string | number;
  newUsersLast24h: string | number;
  newUsersLast7d: string | number;
  newUsersLast30d: string | number;
};

type AdminUserSignupBucketRow = {
  date: string;
  count: string | number;
};

type AdminUserActivitySummaryRow = {
  generatedAt: Date;
  dau: string | number;
  wau: string | number;
  mau: string | number;
};

type AdminUserActiveBucketRow = {
  date: string;
  activeUsers: string | number;
  newUsers: string | number;
  returningUsers: string | number;
};

@Injectable()
export class AdminUserMetricsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getMetricsSummary(
    manager?: EntityManager,
  ): Promise<AdminUserMetricsSummary> {
    const rows = await this.getManager(manager).query<
      AdminUserMetricsSummaryRow[]
    >(
      `
        WITH user_auth AS (
          SELECT
            u.user_id,
            u.created_at,
            BOOL_OR(ua.is_verified) AS is_verified,
            BOOL_OR(ua.provider = 'email') AS has_email_auth,
            BOOL_OR(ua.provider = 'google') AS has_google_auth,
            BOOL_OR(ua.provider = 'github') AS has_github_auth
          FROM prism_users_l u
                 LEFT JOIN prism_user_auths_l ua
                           ON ua.user_id = u.user_id
          GROUP BY u.user_id, u.created_at
        ),
        active_sessions AS (
          SELECT DISTINCT user_id
          FROM prism_refresh_tokens_l
          WHERE revoked_at IS NULL
            AND expires_at > NOW()
        ),
        workspace_membership AS (
          SELECT DISTINCT user_id
          FROM prism_workspace_members_l
        )
        SELECT
          NOW() AS "generatedAt",
          COUNT(*) AS "totalUsers",
          COUNT(*) FILTER (
            WHERE ua.is_verified
          ) AS "verifiedUsers",
          COUNT(*) FILTER (
            WHERE NOT COALESCE(ua.is_verified, FALSE)
          ) AS "unverifiedUsers",
          COUNT(*) FILTER (
            WHERE ua.has_email_auth
          ) AS "usersWithEmailAuth",
          COUNT(*) FILTER (
            WHERE ua.has_google_auth
          ) AS "usersWithGoogleAuth",
          COUNT(*) FILTER (
            WHERE ua.has_github_auth
          ) AS "usersWithGithubAuth",
          COUNT(*) FILTER (
            WHERE ua.has_google_auth
               OR ua.has_github_auth
          ) AS "usersWithOauthAuth",
          COUNT(*) FILTER (
            WHERE asess.user_id IS NOT NULL
          ) AS "usersWithActiveSession",
          COUNT(*) FILTER (
            WHERE wm.user_id IS NOT NULL
          ) AS "usersInWorkspace",
          COUNT(*) FILTER (
            WHERE wm.user_id IS NULL
          ) AS "usersWithoutWorkspace",
          COUNT(*) FILTER (
            WHERE ua.created_at >= NOW() - INTERVAL '24 hours'
          ) AS "newUsersLast24h",
          COUNT(*) FILTER (
            WHERE ua.created_at >= NOW() - INTERVAL '7 days'
          ) AS "newUsersLast7d",
          COUNT(*) FILTER (
            WHERE ua.created_at >= NOW() - INTERVAL '30 days'
          ) AS "newUsersLast30d"
        FROM user_auth ua
               LEFT JOIN active_sessions asess
                         ON asess.user_id = ua.user_id
               LEFT JOIN workspace_membership wm
                         ON wm.user_id = ua.user_id
      `,
    );
    const row = rows[0];

    return {
      generatedAt: row.generatedAt,
      totalUsers: Number(row.totalUsers),
      verifiedUsers: Number(row.verifiedUsers),
      unverifiedUsers: Number(row.unverifiedUsers),
      usersWithEmailAuth: Number(row.usersWithEmailAuth),
      usersWithGoogleAuth: Number(row.usersWithGoogleAuth),
      usersWithGithubAuth: Number(row.usersWithGithubAuth),
      usersWithOauthAuth: Number(row.usersWithOauthAuth),
      usersWithActiveSession: Number(row.usersWithActiveSession),
      usersInWorkspace: Number(row.usersInWorkspace),
      usersWithoutWorkspace: Number(row.usersWithoutWorkspace),
      newUsersLast24h: Number(row.newUsersLast24h),
      newUsersLast7d: Number(row.newUsersLast7d),
      newUsersLast30d: Number(row.newUsersLast30d),
    };
  }

  async getSignupTrend(
    params: GetAdminUserSignupTrendParams,
    manager?: EntityManager,
  ): Promise<AdminUserSignupTrend> {
    const rows = await this.getManager(manager).query<
      AdminUserSignupBucketRow[]
    >(
      `
        WITH bounds AS (
          SELECT
            date_trunc('day', NOW()) AS end_day,
            date_trunc('day', NOW()) - (($1::INT - 1) * INTERVAL '1 day') AS start_day
        ),
        days AS (
          SELECT generate_series(
            (SELECT start_day FROM bounds),
            (SELECT end_day FROM bounds),
            INTERVAL '1 day'
          ) AS day
        )
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS "date",
          COUNT(u.user_id) AS "count"
        FROM days d
               LEFT JOIN prism_users_l u
                         ON date_trunc('day', u.created_at) = d.day
        GROUP BY d.day
        ORDER BY d.day
      `,
      [params.windowDays],
    );

    const buckets = rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    return {
      generatedAt: new Date(),
      windowDays: params.windowDays,
      totalSignups: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
      buckets,
    };
  }

  async getActivitySummary(
    manager?: EntityManager,
  ): Promise<AdminUserActivitySummary> {
    const rows = await this.getManager(manager).query<
      AdminUserActivitySummaryRow[]
    >(
      `
        SELECT
          NOW() AS "generatedAt",
          COUNT(*) FILTER (
            WHERE last_active_at >= NOW() - INTERVAL '1 day'
          ) AS "dau",
          COUNT(*) FILTER (
            WHERE last_active_at >= NOW() - INTERVAL '7 days'
          ) AS "wau",
          COUNT(*) FILTER (
            WHERE last_active_at >= NOW() - INTERVAL '30 days'
          ) AS "mau"
        FROM prism_users_l
      `,
    );
    const row = rows[0];
    const dau = Number(row.dau);
    const mau = Number(row.mau);

    return {
      generatedAt: row.generatedAt,
      dau,
      wau: Number(row.wau),
      mau,
      stickiness: mau > 0 ? Number((dau / mau).toFixed(4)) : null,
    };
  }

  async getActiveUserTrend(
    params: GetAdminUserActiveTrendParams,
    manager?: EntityManager,
  ): Promise<AdminUserActiveTrend> {
    const rows = await this.getManager(manager).query<
      AdminUserActiveBucketRow[]
    >(
      `
        WITH bounds AS (
          SELECT
            CURRENT_DATE AS end_day,
            CURRENT_DATE - ($1::INT - 1) AS start_day
        ),
        days AS (
          SELECT generate_series(
            (SELECT start_day FROM bounds),
            (SELECT end_day FROM bounds),
            INTERVAL '1 day'
          )::DATE AS day
        ),
        windowed AS (
          SELECT
            a.activity_date,
            a.user_id,
            u.created_at::DATE AS signup_date
          FROM prism_user_daily_activity_l a
                 INNER JOIN prism_users_l u
                            ON u.user_id = a.user_id
          WHERE a.activity_date >= (SELECT start_day FROM bounds)
        )
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS "date",
          COUNT(w.user_id) AS "activeUsers",
          COUNT(w.user_id) FILTER (
            WHERE w.signup_date = d.day
          ) AS "newUsers",
          COUNT(w.user_id) FILTER (
            WHERE w.signup_date < d.day
          ) AS "returningUsers"
        FROM days d
               LEFT JOIN windowed w
                         ON w.activity_date = d.day
        GROUP BY d.day
        ORDER BY d.day
      `,
      [params.windowDays],
    );

    return {
      generatedAt: new Date(),
      windowDays: params.windowDays,
      buckets: rows.map((row) => ({
        date: row.date,
        activeUsers: Number(row.activeUsers),
        newUsers: Number(row.newUsers),
        returningUsers: Number(row.returningUsers),
      })),
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
