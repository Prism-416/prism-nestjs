export const USER_PREFERENCE_THEMES = ['system', 'light', 'dark'] as const;

export type UserPreferenceTheme = (typeof USER_PREFERENCE_THEMES)[number];

export interface UserPreferencesRow {
  theme: UserPreferenceTheme;
  locale: string;
  timezone: string;
  emailNotificationsEnabled: boolean;
  updatedAt: Date;
}

export interface UpdateUserPreferencesParams {
  userId: string;
  theme?: UserPreferenceTheme;
  locale?: string;
  timezone?: string;
  emailNotificationsEnabled?: boolean;
}
