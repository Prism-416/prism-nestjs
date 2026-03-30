export type UserCredentialRow = {
  authId: string;
  userId: string;
  email: string;
  password: string;
  fullName: string;
  username: string;
  isVerified: boolean;
};

export type UserProfileRow = Omit<UserCredentialRow, 'password'>;
export type AuthProvider = 'email' | 'google' | 'github';
export type CreatedUserRow = UserProfileRow & {
  createdAt: Date;
};

export type RefreshTokenRow = {
  refreshTokenId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type EmailVerificationTokenRow = {
  emailTokenId: string;
  authId: string;
  emailTokenHash: string;
  expiresAt: Date | null;
  usedAt: Date | null;
};

export type GoogleProfile = {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
};

export type GithubProfile = {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
};
