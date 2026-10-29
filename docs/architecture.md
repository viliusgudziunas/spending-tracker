# Spending Tracker — Architecture

## Overview

Spending Tracker is a full-stack web application for analysing bank statement CSV files. Users upload CSV exports from their bank, the backend parses them into transaction records, and a rules engine categorises each transaction into user-defined categories and filters. Transactions that don't match any rule surface as "unidentified" and can be assigned manually.

---

## Tech Stack

### Backend

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| Language           | Python 3.14                    |
| Framework          | FastAPI                        |
| ORM                | SQLAlchemy 2 (mapped columns)  |
| Database           | PostgreSQL 16 (Alpine)         |
| Migrations         | Alembic                        |
| Validation         | Pydantic 2 / pydantic-settings |
| CSV Parsing        | Pandas                         |
| Server             | Uvicorn                        |
| Package Manager    | Poetry                         |
| Linting / Types    | Ruff, ty                       |
| Testing            | Pytest (unit + integration)    |

### Frontend

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Language         | TypeScript                     |
| UI Library       | React 18                       |
| Routing          | TanStack Router (file-based)   |
| Server State     | TanStack Query                 |
| API Validation   | Zod                            |
| Styling          | Tailwind CSS 4                 |
| Data Grid        | AG Grid (Community)            |
| Drag & Drop      | dnd-kit                        |
| HTTP Client      | Axios                          |
| Build Tool       | Vite 5                         |
| Linting / Format | ESLint, Prettier               |
| Testing          | Vitest                         |

### Infrastructure

| Component     | Technology                              |
| ------------- | --------------------------------------- |
| Orchestration | Docker Compose                          |
| Hot Reload    | `docker compose watch` (sync + rebuild) |
| DB Backups    | `scripts/backup-db.sh` / `restore-db.sh` |

---

## Backend Architecture

### Layers

The backend (`backend/app/`) is organised by layer, with one module per domain (category, filter, plan, report) in each layer:

```
HTTP Request
    │
    ▼
api/routes/       FastAPI routers. Translate repository exceptions → HTTP errors.
api/schemas/      Pydantic request/response models.
    │
    ▼
services/         Business logic (plan ordering, report generation, rule matching, CSV parsing).
    │
    ▼
repositories/     All database access. DTOs for writes; domain exceptions in
                  repositories/exceptions.py (e.g. ReportNotFoundError).
    │
    ▼
db/               SQLAlchemy engine/session (base.py) and all models (models.py).
```

Convention: routes stay thin and delegate to a service; services orchestrate repositories and other services; only repositories touch the session.

### API Surface

Four domains, all registered in `main.py`. Full request/response detail lives in FastAPI's `/docs`; the summary:

- **Reports** (`/reports`) — CRUD for reports (created by uploading a CSV; each report may have a unique `YYYY-MM` month), `POST /{id}/generate` to run the rules engine, `PUT`/`DELETE` on `/{id}/transactions/{tx_id}/assignment` for manual assignments, and `POST /{id}/manual-filters` for report-only filters. `GET /breakdown` is the same domain (not a fifth one): month-by-month actuals across generated reports that have a month, served at `/breakdown` because it is not a `/reports` path.
- **Categories** (`/categories`) — create, list, and update (rename/reposition) rule categories.
- **Filters** (`/filters`) — CRUD for rule filters plus `PUT /{id}/rule-groups` to replace a filter's rule groups wholesale.
- **Plan** (`/plan/sections`) — CRUD for the ordered sections of the monthly budget waterfall. Section responses include ordered plan lines; `POST /plan/sections/{id}/lines` appends a named line within a section. `PATCH` and `DELETE /plan/lines/{id}` rename, reorder, or remove a line, keeping positions contiguous within its section.

### Key Flows

**CSV parsing** (`statement_service`) — The uploaded file is read into a Pandas DataFrame, column names are normalised to `snake_case`, and each row keeps its original un-normalised data in a `raw_data` dict. Reverted and pending rows are stripped in the upload UI after the user confirms; they never reach the API. The report service maps remaining rows into DTOs and persists them as transactions.

**Report generation** (`report_service`) — `POST /reports/{id}/generate` rebuilds the report's categorisation from scratch:

1. Extract any existing manual assignments and manual filters from `report.data`, then reset it.
2. Walk the current rule definitions (category → filter → rule group). Within a group, matches are intersected across rules (AND logic); matched transactions are removed from the pool and recorded against the filter.
3. Re-apply manual filters and manual assignments on top, then persist the whole result as JSON into `report.data`.

Because generation snapshots rule *results* (not references), historical reports are unaffected by later rule edits; regenerating picks up the current rules.

**Rule matching** (`transactions_service`) — Three rule types: `DESCRIPTION` and `PRODUCT` (exact case-insensitive string match) and `AMOUNT` (Decimal comparison using `EQUAL`, `NOT_EQUAL`, `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_EQUAL`, `LESS_THAN_EQUAL`).

**Manual assignments & manual filters** — A user can assign a transaction to an existing rule filter or to a report-only "manual filter" created ad hoc. Both live inside `report.data` (keyed so they survive regeneration) rather than in their own tables. Removing an assignment also removes its manual filter if it becomes unused.

---

## Database

Single PostgreSQL database, single (public) schema, eight tables:

**Rules domain** — reusable rule definitions, independent of any report:

| Table        | Purpose                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| `category`   | Named, ordered grouping of filters (e.g. "Groceries"). Unique name.            |
| `filter`     | A named, ordered matcher within a category. Unique name.                       |
| `rule_group` | A group of rules on a filter, combined with `AND`/`OR`.                        |
| `rule`       | One matching condition: `type`, `operator`, `value`.                           |

Relationships: `category` 1→N `filter` 1→N `rule_group` 1→N `rule`, cascading deletes throughout.

**Reports domain**:

| Table         | Purpose                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `report`      | A named report created from a CSV upload. Optional unique `month` (`YYYY-MM`). Categorisation lives in a `data` JSONB column. |
| `transaction` | One bank statement row: financial fields, `raw_data` JSONB (original CSV row), `source` enum.        |

Relationship: `report` 1→N `transaction` (cascade delete).

**Planning domain**:

| Table          | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `plan_section` | Named, ordered groups in the budget waterfall; income groups are marked. |
| `plan_line` | Named budget rows, ordered within their section. |

Relationship: `plan_section` 1→N `plan_line` (cascade delete).

**Key design choice:** report categorisation is stored as a JSON snapshot in `report.data` — `{categories: [{name, filters: [{name, rule_filter_id, transaction_ids}]}], manual_filters, manual_assignments}` — not as foreign keys into the rules tables. Earlier versions used dedicated snapshot tables (`report.category`, `report.filter`, `override` in a separate `report` schema); those were migrated into the JSONB structure and dropped.

**Schema versioning:** `report` and `transaction` rows carry a `schema_version` integer so old records stay readable. Transaction v1 has only the minimal fields (`description`, `amount`, `fee`, dates); v2 adds `type`, `product`, `currency`, `state`, `balance`, `raw_data`. The API serialises the right shape via Pydantic discriminated unions keyed on `schema_version`.

---

## Frontend Architecture

### Routing

TanStack Router with file-based routes in `src/routes/` (tree auto-generated into `routeTree.gen.ts`). The root route provides the TanStack Query client; the `_app` layout route wraps pages in `AppShell` (collapsible reports sidebar + main area).

| Path                  | Page               |
| --------------------- | ------------------ |
| `/` and `/upload`     | `ReportUploadPage` — CSV upload with client-side AG Grid preview. |
| `/reports/:reportId`  | `ReportDetailPage` — categorised transactions, generation, manual assignment. |
| `/plan`               | `PlanPage` — monthly budget planning. |
| `/breakdown`          | `BreakdownPage` — category/filter actuals by month. Filter rows can be hidden in this browser; category totals stay as the API returned them. |

### Data Layer

```
Component → TanStack Query hooks (src/hooks/) → BackendClient (src/clients/backendClient/)
```

- **`client.ts`** — `BackendClient` class with one method per endpoint, built on a shared Axios instance. A singleton lives in `src/shared/stores/client.ts` (base URL from `VITE_API_URL`).
- **`responseParsers.ts` / `schemas.ts`** — Zod schemas validate API responses and transform snake_case JSON into camelCase domain types; the Zod-inferred types *are* the frontend's domain types.
- **`requestMappers.ts` / `types.ts`** — camelCase payload types mapped back to snake_case for requests.
- **Hooks** (`useReportsQueries`, `useCategoryQueries`, `useFilterQueries`, `usePlanQueries`, …) wrap queries and mutations, and invalidate the relevant query keys on success. There is no other client-side state store.

### Components

- `components/report-detail/` — report page, split into `sections/` (category and unidentified-transaction sections with AG Grid tables and context menus) and `panels/` (side panels for assigning transactions and creating filters).
- `components/categories-panel/` — rule management UI: sortable categories and filters (dnd-kit), inline create/rename, and rule-group editing. See `.cursor/rules/categories-panel.mdc` for its internal structure.
- `components/plan/` — ordered sections and their named budget rows. `PlanPage` and `usePlanSectionsState` manage sections; `PlanSectionLines` manages row creation, reordering, and deletion within a section; `PlanLineRow` owns inline renaming. “+ Add section” and “+ Add row” reveal focused forms that close on save or cancel. Rows have up/down controls and deletion confirmation. Failed mutations display errors; failed saves retain the entered name.
- `usePlanQueries` reads nested rows through `GET /plan/sections` (`PLAN_SECTIONS_QUERY_KEY`). Every section/row mutation invalidates that query; row add/move/delete controls stay disabled within their section until the mutation and refresh finish. Plan rows currently have names and positions only; amounts, month columns, totals, and percentage defaults remain future work.
- `components/breakdown/` — month-by-month category/filter spending grid. Hidden months and hidden filter rows are display preferences in `localStorage`.

---

## Infrastructure

### Docker Compose

| Service    | Port | Purpose                    |
| ---------- | ---- | -------------------------- |
| `postgres` | 5432 | PostgreSQL database        |
| `backend`  | 8001 | FastAPI (Uvicorn). Host port 8001, process port 8000, so another local API can keep 8000. |
| `frontend` | 5174 | Vite dev server. Host port 5174, process port 5173. |

Environment: backend gets `DATABASE_URL` and `ORIGIN_URL` (CORS origin); frontend gets `VITE_API_URL`. `docker compose watch` syncs source into the containers and rebuilds on lockfile changes.

### Make Targets

| Target                           | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `make up`                        | Start all services with build + watch              |
| `make lint`                      | Backend (ruff + ty) and frontend (eslint + prettier) |
| `make test` / `test-unit` / `test-integration` | Backend pytest suites               |
| `make db-autogenerate msg="..."` | Auto-generate an Alembic migration                 |
| `make db-upgrade` / `db-downgrade-1` | Apply / roll back migrations                   |

### Testing

Backend tests live in `backend/tests/` — `unit/` for services, `integration/` for API routes, separated by pytest markers. By default, integration sessions create a temporary PostgreSQL database, migrate it to head, isolate each test in a rolled-back transaction, then drop the temporary database. `TEST_DATABASE_URL` can point to a dedicated, pre-provisioned test database when the database user cannot create databases. The application database is never migrated or modified by tests. Frontend pure helpers are checked with Vitest (`npm test` in `frontend/`).

### Alembic

Migrations live in `backend/migrations/versions/` with date-prefixed filenames. Post-write hooks run `ruff format` and `ruff check --fix` on generated files, and the template uses modern type hints.
