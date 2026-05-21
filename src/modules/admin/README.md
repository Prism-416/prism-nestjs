# Internal Service Tokens

Create internal service API tokens with the operator script, not through public HTTP routes.

```bash
pnpm internal:create-token -- \
  --service-name embedding-worker \
  --description "Embedding job worker" \
  --token-name production-worker \
  --scopes embeddings:write \
  --expires-in-days 90
```

The script prints the raw token once. Store it in the calling service secret store.

Supported scopes:

- `agents:invoke`
- `documents:read`
- `documents:write`
- `embeddings:write`
- `projects:read`

Use `--expires-at <iso-date>` instead of `--expires-in-days` when an exact expiration time is required.
