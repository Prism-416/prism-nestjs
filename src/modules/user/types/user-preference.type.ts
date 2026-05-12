export type UserPreferenceTheme = 'system' | 'light' | 'dark';

export interface UserPreferencesRow {
  theme: UserPreferenceTheme;
  locale: string;
  timezone: string;
  emailNotificationsEnabled: boolean;
  updatedAt: Date;
}
