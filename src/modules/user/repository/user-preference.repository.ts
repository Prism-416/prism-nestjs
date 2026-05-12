import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  UpdateUserPreferencesParams,
  UserPreferencesRow,
} from '@/modules/user/types';

@Injectable()
export class UserPreferenceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findPreferencesByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<UserPreferencesRow | null> {
    const preferences = await this.getManager(manager).query<
      UserPreferencesRow[]
    >(
      `
        SELECT
          theme,
          locale,
          timezone,
          email_notifications_enabled AS "emailNotificationsEnabled",
          updated_at AS "updatedAt"
        FROM prism_user_preferences_l
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return preferences[0] ?? null;
  }

  async updatePreferences(
    params: UpdateUserPreferencesParams,
    manager?: EntityManager,
  ): Promise<UserPreferencesRow | null> {
    const preferences = await this.getManager(manager).query<
      UserPreferencesRow[]
    >(
      `
        UPDATE prism_user_preferences_l
        SET theme = COALESCE($2, theme),
            locale = COALESCE($3, locale),
            timezone = COALESCE($4, timezone),
            email_notifications_enabled = COALESCE($5, email_notifications_enabled),
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING
          theme,
          locale,
          timezone,
          email_notifications_enabled AS "emailNotificationsEnabled",
          updated_at AS "updatedAt"
      `,
      [
        params.userId,
        params.theme ?? null,
        params.locale ?? null,
        params.timezone ?? null,
        params.emailNotificationsEnabled ?? null,
      ],
    );

    return preferences[0] ?? null;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
