# Admin Service Tokens

Admin users issue and manage API tokens for backend-to-backend requests. The
routes in this module are mounted under `/admin` when `DB_ENABLED=true`.

## Admin Authentication

Configure `ADMIN_PASSWORD` and pass it in the `x-admin-password` header when
calling admin routes. The guard trims both values and compares SHA-256 digests
with `timingSafeEqual`. If `ADMIN_PASSWORD` is empty, admin routes reject all
callers.

```bash
curl -sS "$API_BASE_URL/admin/service-accounts" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

For mutating admin requests, optionally pass `x-admin-reason` with a concise
operator reason. The reason is stored with the admin audit event and is limited
to 500 characters.

## Service Token Authentication

Internal services can pass tokens through either header:

- `Authorization: Bearer <token>`
- `x-internal-api-token: <token>`

Use `@RequireInternalScopes(...)` on internal endpoints. The guard validates the
token, rejects inactive service accounts, revoked tokens, expired tokens, and
requests missing any required scope.

```ts
@Post('internal/claim')
@RequireInternalScopes('embeddings:write')
claimJobs() {
  // ...
}
```

## Token Issuance

Use this endpoint when the service account already exists:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts/$SERVICE_ACCOUNT_ID/api-tokens" \
  -X POST \
  -H "content-type: application/json" \
  -H "x-admin-password: $ADMIN_PASSWORD" \
  -d '{
    "name": "embedding-worker-prod",
    "scopes": ["embeddings:write"],
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }'
```

Use this endpoint to create-or-find a service account by name and issue a token
in one request:

```bash
curl -sS "$API_BASE_URL/admin/service-api-tokens" \
  -X POST \
  -H "content-type: application/json" \
  -H "x-admin-password: $ADMIN_PASSWORD" \
  -d '{
    "serviceName": "embedding-worker",
    "serviceDescription": "Consumes queued embedding jobs",
    "tokenName": "prod",
    "scopes": ["embeddings:write"],
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }'
```

Issue-token responses include the raw token once. Persist it in the calling
service secret store. Listing, update, and revoke endpoints return token
metadata only and never return `tokenHash`.

## Token Operations

List service accounts:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

Update service account metadata:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts/$SERVICE_ACCOUNT_ID" \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-admin-password: $ADMIN_PASSWORD" \
  -d '{
    "description": "Consumes queued embedding jobs"
  }'
```

Deactivate or reactivate a service account:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts/$SERVICE_ACCOUNT_ID/deactivate" \
  -X POST \
  -H "x-admin-password: $ADMIN_PASSWORD"

curl -sS "$API_BASE_URL/admin/service-accounts/$SERVICE_ACCOUNT_ID/activate" \
  -X POST \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

List tokens for a service account:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts/$SERVICE_ACCOUNT_ID/api-tokens" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

Update token metadata, scopes, or expiration:

```bash
curl -sS "$API_BASE_URL/admin/service-api-tokens/$API_TOKEN_ID" \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-admin-password: $ADMIN_PASSWORD" \
  -d '{
    "name": "prod-rotation-2026",
    "scopes": ["embeddings:write"],
    "expiresAt": "2027-01-31T00:00:00.000Z"
  }'
```

Revoke a token:

```bash
curl -sS "$API_BASE_URL/admin/service-api-tokens/$API_TOKEN_ID/revoke" \
  -X POST \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

## Admin Audit Events

Successful service-account and service-token mutations write metadata-only audit
events. Audit events intentionally avoid request payloads, customer workspace
content, IP addresses, user agents, token hashes, and raw tokens.

List recent audit events:

```bash
curl -sS "$API_BASE_URL/admin/audit-events?limit=50" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

Filter by action or target:

```bash
curl -sS "$API_BASE_URL/admin/audit-events?action=service_api_token.revoke" \
  -H "x-admin-password: $ADMIN_PASSWORD"

curl -sS "$API_BASE_URL/admin/audit-events?targetType=service_account&targetId=$SERVICE_ACCOUNT_ID" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

## Endpoint Reference

- `GET /admin/audit-events`
- `GET /admin/service-accounts`
- `POST /admin/service-accounts`
- `PATCH /admin/service-accounts/:serviceAccountId`
- `POST /admin/service-accounts/:serviceAccountId/activate`
- `POST /admin/service-accounts/:serviceAccountId/deactivate`
- `GET /admin/service-accounts/:serviceAccountId/api-tokens`
- `POST /admin/service-accounts/:serviceAccountId/api-tokens`
- `POST /admin/service-api-tokens`
- `PATCH /admin/service-api-tokens/:apiTokenId`
- `POST /admin/service-api-tokens/:apiTokenId/revoke`

## Supported Scopes

- `agents:invoke`
- `documents:read`
- `documents:write`
- `embeddings:write`
- `projects:read`
