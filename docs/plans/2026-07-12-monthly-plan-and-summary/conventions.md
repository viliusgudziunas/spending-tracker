# Conventions for all steps

Read this before implementing any step in this folder. It explains the codebase patterns every step must follow. The overall feature design is in [plan.md](plan.md) — read its "Decisions made together" and schema diagram first.

## Workflow

- Each step is a reviewable slice: working app, no dead code, something visible in the UI. Leave edits unstaged and uncommitted unless explicitly asked; preserve any pre-existing staged work.
- Before starting a step, set its status in [plan.md](plan.md) to `[IN PROGRESS]`; after implementation and verification, set it to `[IMPLEMENTED]`; after an explicitly authorized commit, set it to `[COMMITTED]`. If implementation deviates from the step description, add a note under the step heading in plan.md.
- The app runs via `make up` (Docker Compose: postgres :5432, backend :8001, frontend :5174, hot reload enabled).
- Lint with `make lint`. Tests: `make test-unit` / `make test-integration` (pytest; unit tests in `backend/tests/unit/`, integration fixtures provision a temporary PostgreSQL database or use `TEST_DATABASE_URL`, with each test rolled back). Add tests for non-trivial backend logic, mirroring existing test files.

## Backend patterns

Layering: route → service → repository. Routes never touch the DB directly.

- Models: `backend/app/db/models.py` — SQLAlchemy 2 `Mapped`/`mapped_column` style. Mirror `Category` for new tables (UUID pk with `default=uuid.uuid4`, `position: Mapped[int]`, StrEnum classes for enums).
- Migrations: `make db-autogenerate msg="..."` after editing models, then review the generated file in `backend/migrations/versions/` (ruff hooks format it automatically), then `make db-upgrade`. Always provide a working `downgrade()`. When a migration needs data backfill, do it inside the migration with `op.execute(...)`.
- Repositories: `backend/app/repositories/` — one file per aggregate (see `category_repository.py`). Create/update DTOs live in `backend/app/repositories/dtos.py` as dataclasses. Not-found errors raise exceptions from `backend/app/repositories/exceptions.py`.
- Services: `backend/app/services/` — business logic (see `category_service.py`, `report_service.py`).
- API schemas: `backend/app/api/schemas/` — Pydantic request/response models, snake_case JSON (see `category_schemas.py`).
- Routes: `backend/app/api/routes/` — FastAPI routers (see `category_routes.py`), DB session via `Depends(get_db)` from `backend/app/api/dependencies.py`. Register new routers in `backend/app/main.py`.
- Report money math: compute aggregations with `Decimal` (mirror `Decimal(str(tx.amount))` in `report_service.py`), round to 2 decimals only at the JSON serialization boundary. Report amounts stay in DB sign (debits negative) in API responses.
- Plan money: store fixed euro amounts as nullable `NUMERIC(12,2)` and use Python `Decimal`. Accept decimal strings or null in the API; emit two-decimal strings or null. Reject negative, non-finite, malformed, out-of-range, or more-than-two-decimal inputs rather than rounding. Income and expense budgets are both non-negative. Null means unset, not zero; see the [Step 3 contract](step-03-month-columns-fixed-defaults.md#money-and-patch-contract).
- Month strings: `month_schemas.py` defines the shared `MonthKey` and `parse_month_range` helper, using pandas monthly periods. `GET /plan` requires an ascending inclusive range of 1–120 months: missing bounds return 422; malformed, reversed, or oversized ranges return 400. Reject oversized ranges rather than clamping them. Report schemas share the month-key type and retain their existing endpoint validation behavior.

## Frontend patterns

Stack: React 18 + TypeScript, TanStack Router (file-based), TanStack Query, AG Grid Community, Tailwind, Axios + Zod.

- API client: add methods to the `BackendClient` class in `frontend/src/clients/backendClient/client.ts`. Responses are validated with Zod schemas in `frontend/src/clients/backendClient/responseParsers.ts` (schema + inferred type + parse function per resource). Request payload types go in `types.ts`; camelCase→snake_case mapping happens inline in the client method or in `requestMappers.ts`.
- Query hooks: `frontend/src/hooks/` — one file per resource (see `useCategoryQueries.ts`): exported `QUERY_KEY` const, `useXQuery` wrapping `useQuery`, `useXMutation` wrapping `useMutation` with `invalidateQueries` on success. The client instance comes from `frontend/src/shared/stores/client.ts`.
- Routes/pages: new pages go under `frontend/src/routes/_app/` (e.g. `plan.tsx`) so they get the shared sidebar layout from `_app.tsx`. Route files are thin — they render a page component from `frontend/src/components/`. `routeTree.gen.ts` regenerates automatically via the Vite plugin.
- Sidebar: `frontend/src/components/AppSidebar.tsx` — add nav links for new pages here.
- Styling: Tailwind utility classes, with one Plan exception: the inline `gridTemplateColumns` value depends on the runtime month count. Uniform-row tables use AG Grid Community only (no Enterprise features: no row grouping / tree data / master-detail). The `/plan` grid uses CSS grid/subgrid with a name column that is sticky at grid-container widths of at least `36rem`; narrower grids scroll the whole row (see step 3); `/summary` remains part of the superseded reporting design.
- Query invalidation: the Plan page uses only the computed-grid query, keyed by `[...PLAN_QUERY_KEY, from, to]`. Every section/row mutation invalidates the `PLAN_QUERY_KEY` prefix and awaits the active refresh so pending guards cover it. Keep previous grid data while fetching another range; keep form drafts local.
- Plan amounts: validate API responses and convert decimal strings into integer cents at the parser boundary (`fixedAmountCents`, `amountsCents`, `totalsCents`); preserve null versus explicit zero. Serialize cents back into decimal strings for writes. Monthly totals come from backend `Decimal` calculations, replacing 3a's frontend summation. Never sum binary floating-point euro values or persist totals/monthly copies of recurring defaults.
- Report sign convention: bank debits are negative in the DB and in API responses; the frontend flips to positive-spending at parse time (see `responseParsers.ts` — report detail and summary both follow this; never flip in the backend). Plan amounts do not use this sign flip.

## Domain vocabulary

- **Category / Filter**: the existing 2-level spending taxonomy (e.g. category `Food` contains filters `Lidl`, `Barbora`). Managed in the categories panel; the rules engine assigns transactions to filters.
- **Report**: one uploaded bank statement CSV, being tied to a month (`YYYY-MM`) by this feature. `report.data` (JSONB) holds the generated categorisation: `categories[].filters[].transaction_ids`.
- **Plan**: the monthly budget grid — sections (waterfall order, one flagged `is_income`) containing lines, with default values (fixed or percent) and per-month overrides.
- **Left over**: computed row after each non-income section = income total minus all non-income section totals so far (in position order). Never stored.
- **Month key**: months are always passed as `YYYY-MM` strings.
