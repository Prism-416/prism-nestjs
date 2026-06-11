export type AdminUserMetricsSummary = {
  generatedAt: Date;
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersWithEmailAuth: number;
  usersWithGoogleAuth: number;
  usersWithGithubAuth: number;
  usersWithOauthAuth: number;
  usersWithActiveSession: number;
  usersInWorkspace: number;
  usersWithoutWorkspace: number;
  newUsersLast24h: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
};

export type AdminUserSignupBucket = {
  date: string;
  count: number;
};

export type GetAdminUserSignupTrendParams = {
  windowDays: number;
};

export type AdminUserSignupTrend = {
  generatedAt: Date;
  windowDays: number;
  totalSignups: number;
  buckets: AdminUserSignupBucket[];
};

export type AdminUserActivitySummary = {
  generatedAt: Date;
  dau: number;
  wau: number;
  mau: number;
  stickiness: number | null;
};
