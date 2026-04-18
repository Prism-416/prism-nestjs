# AGENTS.md

## Project Snapshot

- This repository is a NestJS 11 backend organized as a single app under `src/`.
- Real feature modules live in `src/modules/{auth,onboarding,workspace,project}`.
- Shared infrastructure lives in `src/core`.
- Use the `@/` path alias for imports. It maps to `src/*`.
- `src/app.module.ts` conditionally enables DB-backed modules with `DB_ENABLED`, so check env assumptions before changing bootstrapping.
- Prefer updating `src/` over `dist/`; do not hand-edit generated output.

## Must-follow Architecture

- Keep feature logic inside `src/modules/<feature>`.
- Keep domain-neutral infrastructure inside `src/core`.
- Prefer module-local layout: `controller`, `dto`, `usecases`, `services`, `repository`, `errors`, `utils`, `constants`, `types`.
- Keep cross-feature coupling narrow. If logic is reused broadly, move the reusable part into `src/core` or a clearly shared abstraction instead of building deep feature-to-feature dependencies.
- Do not invent new architectural layers unless the existing module structure is clearly insufficient for the change.

## Layer Responsibilities

- `controller`
  - Handle routing, auth decorators, Swagger decorators, params/body binding, and HTTP status metadata.
  - Stay thin. Controllers should not contain domain orchestration, persistence logic, or side effect coordination.
- `dto`
  - Own request/response contracts, validation decorators, and input normalization.
  - Reuse existing transform helpers and validation patterns instead of inlining trimming or string sanitation logic.
- `usecases`
  - Own application orchestration, transaction boundaries, permission-aware workflows, and domain decision-making.
  - Multistep writes should go through `UnitOfWork`.
  - Prefer use cases over controllers for branching business logic.
- `services`
  - Own side effects and external integrations such as notification delivery, provisioning, token verification, or other non-persistence workflows.
  - Services may support use cases; they should not become hidden repositories.
- `repository`
  - Own persistence and SQL.
  - Use `DataSource` or `EntityManager` with raw SQL as the default pattern in this codebase.
  - Keep repository methods shaped around domain operations, not generic CRUD wrappers unless the domain truly is generic.
- `errors`
  - Own business-level failures that should propagate outward.
  - Prefer feature-local domain errors over ad hoc `HttpException` usage for expected business failures.

## Request Flow

Default flow for feature endpoints:

```text
Controller -> DTO binding/auth/swagger -> UseCase -> Repository/Service -> raw DTO
```

Rules:

- Controllers and use cases should return raw DTOs or primitives. Do not manually wrap responses in `{ data: ... }`; `DataResponseInterceptor` already does that globally.
- For simple reads, a controller may call a single use case that delegates directly to a repository query.
- For writes or multistep operations, keep orchestration in the use case and persistence in repositories.
- If a failure is expected and meaningful to the caller, raise a domain error instead of silently returning partial success.
- Do not use throw-and-catch-locally flows. If the same local path is expected to handle the condition, rewrite the logic instead of using exceptions as control flow.

## Persistence And SQL

- Keep SQL in repositories. If a change affects DB behavior, wire migrations through the existing TypeORM CLI flow rather than scattering schema assumptions through the app.
- Keep raw SQL text structurally static. Do not assemble placeholder lists or `VALUES ${...}` fragments in TypeScript.
- For bulk operations, prefer parameterized set-based patterns such as `unnest(...)`, `ANY(...)`, and CTEs so the SQL shape remains fixed and reviewable.
- Prefer one repository to own one table family or aggregate boundary. Do not spread writes to the same persistence concern across unrelated modules without a strong reason.
- Match deletion semantics to the schema that actually exists. Do not invent soft-delete behavior or archive columns unless the schema and domain already support them.
- When a use case runs inside `UnitOfWork`, pass the `EntityManager` through repository methods instead of opening unrelated DB contexts.

## DTO And Validation

- Reuse DTO validation and transform decorators already present in the module.
- Prefer existing normalizers under module `utils/` for trimming or optional-string handling.
- Keep request DTOs strict and explicit. Do not accept broad `Record<string, unknown>` payloads when the shape is known.
- Response DTOs should reflect the actual API contract returned by the feature, not internal row naming.
- If a field is optional for callers, model it intentionally as optional or nullable instead of relying on incidental behavior.

## Naming And File Layout

- Keep names aligned with existing domain language. Prefer concrete names like `WorkspaceInvitationNotifierService` over vague names like `Helper`, `Manager`, or `CommonService`.
- Keep file names short and readable. Avoid long dash-heavy names when a concise domain name communicates the same thing.
- Do not split tiny helpers into separate files just to be "clean." For small `types`, `utils`, or simple exports, prefer keeping them in an existing `index.ts` or nearby module file.
- Avoid over-fragmenting modules. If a new abstraction is only used once and does not improve the domain boundary, keep it in the existing file.
- When adding a new public item to a module folder, update the local `index.ts` only if that export is actually part of the module's normal import surface.

## Change Guardrails

- Do not touch `.env` values unless the task explicitly requires it, and never commit secrets.
- The README is still partly template-oriented. When README text disagrees with the code, trust `src/` and `.github/workflows/ci.yml`.
- Trust real runtime wiring over assumptions. Before changing module registration or bootstrapping, verify the path through `src/app.module.ts` and the relevant feature module.
- Do not introduce generated or build artifacts into commits.

## Verification

- Every implementation task must end with a lint pass. Run `pnpm run lint:check` before closing the work, and treat lint failures as unfinished work.
- Run `pnpm format` after touching TS files. `.husky/pre-commit` already enforces formatting and `pnpm lint:check`.
- Standard checks are `pnpm run lint:check`, `pnpm run build`, `pnpm run test -- --runInBand`, and `pnpm run test:e2e -- --runInBand`.
- Current automated coverage is light. Do not default to writing new tests for every change; prioritize implementation and domain modeling first, and add tests only when the task explicitly asks for them.

## Commit Messages

Use Conventional Commits.

```text
<type>(<scope>): <subject>
```

Rules:

- `type` is one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `build`, `ci`, `revert`.
- `scope` should usually be the feature or area touched: `auth`, `workspace`, `project`, `onboarding`, `core`, `database`, `docs`, etc.
- Write the subject in English, imperative mood, lowercase, without a trailing period.
- Keep commits focused. Do not mix unrelated changes in a single commit.
- Do not commit generated output, secrets, or environment-specific artifacts.

Examples:

```text
feat(project): add project deletion api
fix(workspace): validate role ids before update
refactor(core): align unit of work usage
docs: clarify repository sql rules
```
