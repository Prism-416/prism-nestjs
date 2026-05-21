# Admin Service Tokens

Admin users issue internal service API tokens through the admin HTTP API.

Configure `ADMIN_PASSWORD` and pass it in the `x-admin-password` header when
calling admin routes. If it is empty, admin routes reject all callers.

Token issuance endpoints:

- `GET /admin/service-accounts`
- `POST /admin/service-accounts`
- `POST /admin/service-accounts/:serviceAccountId/api-tokens`
- `POST /admin/service-api-tokens`

The issue-token endpoints return the raw token once. Store it in the calling
service secret store.

Supported scopes:

- `agents:invoke`
- `documents:read`
- `documents:write`
- `embeddings:write`
- `projects:read`
