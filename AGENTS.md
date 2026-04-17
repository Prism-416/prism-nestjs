# AGENTS.md

## Project Snapshot

- This repository is a NestJS 11 backend organized as a single app under `src/`.
- Real feature modules live in `src/modules/{auth,onboarding,workspace,project}`. Shared infrastructure lives in `src/core`.
- Use the `@/` path alias for imports. It maps to `src/*`.
- `src/app.module.ts` conditionally enables DB-backed modules with `DB_ENABLED`, so check env assumptions before changing bootstrapping.

## How To Work Here

- Keep the existing module-local layout: `controller`, `dto`, `usecases`, `services`, `repository`, `errors`, `utils`, `constants`, `types`.
- Keep controllers thin. They should mostly handle routing, auth decorators, Swagger decorators, and DTO binding.
- Put orchestration and transaction boundaries in use cases. Multi-step writes should go through `UnitOfWork`.
- Keep persistence in repositories. The codebase uses `DataSource` or `EntityManager` with raw SQL more than TypeORM entities.
- Keep side effects in services, not repositories.
- Reuse DTO validation and transform decorators. Reuse domain errors instead of throwing generic HTTP exceptions when the failure is business-level.
- Responses are globally wrapped by `DataResponseInterceptor`, so controllers and use cases should return raw DTOs rather than manual `{ data: ... }` envelopes.

## Change Guardrails

- Prefer updating `src/` over `dist/`; do not hand-edit generated output.
- Do not touch `.env` values unless the task explicitly requires it, and never commit secrets.
- The README is still partly template-oriented. When README text disagrees with the code, trust `src/` and `.github/workflows/ci.yml`.
- If a change affects schema or DB behavior, keep SQL in repositories and wire migrations through the existing TypeORM CLI flow.

## Verification

- Every implementation task must end with a lint pass. Run `pnpm run lint:check` before closing the work, and treat lint failures as unfinished work.
- Run `pnpm format` after touching TS files. `.husky/pre-commit` already enforces formatting and `pnpm lint:check`.
- Standard checks are `pnpm run lint:check`, `pnpm run build`, `pnpm run test -- --runInBand`, and `pnpm run test:e2e -- --runInBand`.
- Current automated coverage is light. Do not default to writing new tests for every change; prioritize implementation and domain modeling first, and add tests only when the task explicitly asks for them.

## Code Conventions

- Do not introduce throw-and-catch-locally flows. If an exception is expected to be handled in the same local path, rewrite the logic instead of using `throw` as control flow.
- For business failures that should propagate outward, prefer shared domain errors under each module's `errors/` rather than ad hoc local exceptions.
- Follow a DDD-first approach: model the domain clearly in `usecases`, `services`, `repository`, `dto`, and `errors` before thinking about test scaffolding.
- Do not create test files by default. Implement the behavior first and add tests only when explicitly requested or when there is no other practical way to verify the change.
- Do not split tiny helpers into separate files just to be "clean." For small `types`, `utils`, or simple exports, prefer keeping them in an existing `index.ts` or nearby module file.
- Avoid over-fragmenting modules. If a new abstraction is only used once and does not improve the domain boundary, keep it in the existing file.
- Keep file names short and readable. Avoid long dash-heavy names when a concise domain name communicates the same thing.
- Reuse existing normalizers, constants, and DTO validation patterns instead of inlining repeated trimming, length limits, enum strings, or magic values.
- Keep names aligned with the domain language already used in the module. Prefer concrete names like `WorkspaceInvitationNotifierService` over vague names like `Helper`, `Manager`, or `CommonService`.
- When adding a new public item to a module folder, update the local `index.ts` only if that export is actually part of the module's normal import surface.
