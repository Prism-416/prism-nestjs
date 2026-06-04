export const INTERNAL_SCOPES = [
  'agents:invoke',
  'documents:read',
  'documents:write',
  'embeddings:write',
  'projects:read',
  'projects:write',
  'sprints:write',
] as const;

export type InternalScope = (typeof INTERNAL_SCOPES)[number];

export type InternalServiceAccountRow = {
  serviceAccountId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InternalApiTokenRow = {
  apiTokenId: string;
  serviceAccountId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string;
  scopes: InternalScope[];
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InternalApiTokenMetadataRow = Omit<
  InternalApiTokenRow,
  'tokenHash'
>;

export const INTERNAL_API_TOKEN_INVENTORY_STATUSES = [
  'active',
  'expired',
  'revoked',
] as const;

export type InternalApiTokenInventoryStatus =
  (typeof INTERNAL_API_TOKEN_INVENTORY_STATUSES)[number];

export type InternalApiTokenInventoryRow = InternalApiTokenMetadataRow & {
  serviceAccountName: string;
  serviceAccountActive: boolean;
  status: InternalApiTokenInventoryStatus;
};

export type InternalApiTokenWithServiceRow = InternalApiTokenRow & {
  serviceName: string;
  serviceActive: boolean;
};

export type InternalServicePrincipal = {
  serviceAccountId: string;
  serviceName: string;
  apiTokenId: string;
  tokenName: string;
  scopes: InternalScope[];
};

export type InternalAuthenticatedRequest = {
  internalService?: InternalServicePrincipal;
};

export type CreateInternalServiceAccountParams = {
  name: string;
  description?: string | null;
};

export type UpdateInternalServiceAccountParams = {
  serviceAccountId: string;
  name?: string;
  description?: string | null;
};

export type PersistInternalServiceAccountUpdateParams = {
  serviceAccountId: string;
  name: string | null;
  description: string | null;
  updateDescription: boolean;
};

export type CreateInternalApiTokenParams = {
  serviceAccountId: string;
  name: string;
  scopes: InternalScope[];
  expiresAt: Date;
};

export type UpdateInternalApiTokenParams = {
  apiTokenId: string;
  name?: string;
  scopes?: InternalScope[];
  expiresAt?: Date;
};

export type PersistInternalApiTokenUpdateParams = {
  apiTokenId: string;
  name: string | null;
  scopes: InternalScope[] | null;
  expiresAt: Date | null;
  updateScopes: boolean;
  updateExpiresAt: boolean;
};

export type CreateInternalApiTokenForServiceNameParams = {
  serviceName: string;
  serviceDescription?: string | null;
  tokenName: string;
  scopes: InternalScope[];
  expiresAt: Date;
};

export type PersistInternalApiTokenParams = CreateInternalApiTokenParams & {
  tokenPrefix: string;
  tokenHash: string;
};

export type CreatedInternalApiToken = {
  token: string;
  apiToken: InternalApiTokenRow;
};

export type SearchInternalApiTokensParams = {
  serviceAccountId?: string;
  serviceName?: string;
  status?: InternalApiTokenInventoryStatus;
  expiresBefore?: Date;
  lastUsedBefore?: Date;
  limit: number;
  offset: number;
};

export type SearchInternalApiTokensResult = {
  items: InternalApiTokenInventoryRow[];
  total: number;
  limit: number;
  offset: number;
};

export type InternalApiTokenHealthSummaryParams = {
  expiringWithinDays: number;
  staleAfterDays: number;
};

export type InternalApiTokenHealthSummary = {
  generatedAt: Date;
  expiringWithinDays: number;
  staleAfterDays: number;
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  revokedTokens: number;
  expiringSoonTokens: number;
  neverUsedActiveTokens: number;
  staleActiveTokens: number;
  activeTokensOnInactiveAccounts: number;
};

export type InternalServiceAccountHealthSummary = {
  generatedAt: Date;
  totalServiceAccounts: number;
  activeServiceAccounts: number;
  inactiveServiceAccounts: number;
  serviceAccountsWithTokens: number;
  serviceAccountsWithoutTokens: number;
  activeServiceAccountsWithoutActiveTokens: number;
  inactiveServiceAccountsWithActiveTokens: number;
  serviceAccountsWithMultipleActiveTokens: number;
};
