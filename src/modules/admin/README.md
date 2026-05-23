# Admin Service Tokens

Admin users issue and manage API tokens for backend-to-backend requests. The
routes in this module are mounted under `/admin` when `DB_ENABLED=true`.

## Admin Authentication

Configure `ADMIN_PASSWORD` and pass it in the `x-admin-password` header when
calling admin routes. The guard trims both values and compares SHA-256 digests
with `timingSafeEqual`. If `ADMIN_PASSWORD` is empty, admin routes reject all
callers.

Admin password failures are rate-limited per client address. Defaults are 5
failed attempts within 5 minutes, followed by a 15 minute ban. Configure
`ADMIN_PASSWORD_FAILURE_LIMIT`, `ADMIN_PASSWORD_FAILURE_WINDOW_MS`, and
`ADMIN_PASSWORD_BAN_MS` to tune those thresholds. Banned clients receive
`429 Too Many Requests` with `Retry-After`.

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

Summarize service account health:

```bash
curl -sS "$API_BASE_URL/admin/service-accounts/health" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

The service account health summary returns aggregate counts only, including
active and inactive accounts, accounts with or without tokens, active accounts
without active tokens, inactive accounts that still have active tokens, and
accounts with multiple active tokens.

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

Search service tokens globally without exposing raw tokens or token hashes:

```bash
curl -sS "$API_BASE_URL/admin/service-api-tokens?status=active&expiresBefore=2026-12-31T00:00:00.000Z" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

The global token inventory returns service-account metadata, token prefixes,
scopes, expiration, last-use timestamps, revocation timestamps, and computed
token status. It does not expose user workspace data or token secrets.

Summarize service token health:

```bash
curl -sS "$API_BASE_URL/admin/service-api-tokens/health?expiringWithinDays=30&staleAfterDays=90" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

The health summary returns aggregate counts only, including active, expired,
revoked, expiring-soon, never-used, stale, and inactive-account token counts.

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

## Embedding Operations

Summarize embedding coverage for active workspace projects:

```bash
curl -sS "$API_BASE_URL/admin/embeddings/coverage" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

The embedding coverage summary returns aggregate counts only for document
chunks, work items, work item comments, and agent memories. It includes current,
missing, and stale embedding counts without exposing IDs, source text, file
names, object names, content hashes, or embedding vectors.

Summarize embedding job health:

```bash
curl -sS "$API_BASE_URL/admin/embedding-jobs/health?staleQueuedAfterMinutes=60&staleRunningAfterMinutes=30" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

The embedding job health summary returns aggregate counts only, including
queued, claimable, scheduled, stale queued, exhausted, running, stale running,
completed, failed, cancelled, and pending-project counts. It does not expose job
IDs, project IDs, target IDs, object names, error messages, content hashes, or
document content.

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
- `GET /admin/embeddings/coverage`
- `GET /admin/embedding-jobs/health`
- `GET /admin/service-accounts`
- `GET /admin/service-accounts/health`
- `POST /admin/service-accounts`
- `PATCH /admin/service-accounts/:serviceAccountId`
- `POST /admin/service-accounts/:serviceAccountId/activate`
- `POST /admin/service-accounts/:serviceAccountId/deactivate`
- `GET /admin/service-accounts/:serviceAccountId/api-tokens`
- `POST /admin/service-accounts/:serviceAccountId/api-tokens`
- `GET /admin/service-api-tokens/health`
- `GET /admin/service-api-tokens`
- `POST /admin/service-api-tokens`
- `PATCH /admin/service-api-tokens/:apiTokenId`
- `POST /admin/service-api-tokens/:apiTokenId/revoke`

## Supported Scopes

- `agents:invoke`
- `documents:read`
- `documents:write`
- `embeddings:write`
- `projects:read`
