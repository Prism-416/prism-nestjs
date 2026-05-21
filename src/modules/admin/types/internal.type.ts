export const INTERNAL_SCOPES = [
  'agents:invoke',
  'documents:read',
  'documents:write',
  'embeddings:write',
  'projects:read',
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

export type CreateInternalApiTokenParams = {
  serviceAccountId: string;
  name: string;
  scopes: InternalScope[];
  expiresAt: Date;
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
