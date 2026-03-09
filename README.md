# NestJS Backend Template

Reusable NestJS template with:

- TypeScript + ESLint + Prettier
- PostgreSQL + TypeORM (migrations-ready)
- Swagger docs
- Security baseline (Helmet, CORS, compression, rate limit)
- Structured request logging with request IDs
- Health + readiness endpoints
- Hardened Docker support
- CI workflow for lint/build/tests

## Quick Start

```bash
pnpm install
copy .env.example .env
pnpm run start:dev
```

The app runs on `http://localhost:3000` and Swagger docs are available at `http://localhost:3000/docs`.

## Template Setup Checklist

After creating a new project from this template, update:

1. `package.json` values (`name`, `description`, `author`, `license`)
2. `.env` values (`APP_NAME`, CORS, rate limit, database)
3. Generate domain modules based on your needs (example: `nest g resource users`)
4. API metadata shown in Swagger (driven by env values)
5. Add your first migration before deployment

## Available Scripts

```bash
# development
pnpm run start
pnpm run start:dev
pnpm run start:debug

# production
pnpm run build
pnpm run start:prod

# quality
pnpm run lint
pnpm run lint:check
pnpm run format

# tests
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e

# database migrations
pnpm run migration:create
pnpm run migration:generate
pnpm run migration:run
pnpm run migration:revert
```

## Environment Variables

Use `.env.example` as the base.

Key variables:

- `PORT`
- `CORS_ORIGIN` (comma-separated allowed origins)
- `RATE_LIMIT_TTL_MS`
- `RATE_LIMIT_MAX`
- `DB_ENABLED` (set `true` to enable postgres connection)
- `PG_HOST`
- `PG_PORT`
- `PG_USER`
- `PG_PASSWORD`
- `PG_DB`

## Endpoints

- `GET /health` - process liveness
- `GET /ready` - readiness (includes database check when DB is enabled)
- `GET /docs` - Swagger docs
- `GET /sample/items` - example module list endpoint
- `POST /sample/items` - example module create endpoint

## Docker

```bash
docker build -t nestjs-template .
docker run --env-file .env -p 3000:3000 nestjs-template
```

## Notes

- TypeORM `synchronize` is disabled by default.
- In production, run migrations during deploy (`pnpm run migration:run`).
- Root endpoint redirects to `/health`.
- CI pipeline is available at `.github/workflows/ci.yml`.
