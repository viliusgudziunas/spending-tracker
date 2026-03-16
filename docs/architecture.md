# Spending Tracker — Architecture & Current State

## Overview

Spending Tracker is a full-stack web application for analysing bank statement CSV files. Users upload CSV exports from their bank, the backend parses them into transaction records, and a rules engine categorises each transaction into user-defined filters and categories. Transactions that don't match any rule surface as "unidentified" for manual override.

---

## Tech Stack

### Backend

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| Language           | Python 3.12                    |
| Framework          | FastAPI                        |
| ORM                | SQLAlchemy 2 (mapped columns)  |
| Database           | PostgreSQL 16.4 (Alpine)       |
| Migrations         | Alembic                        |
| Validation         | Pydantic 2 / pydantic-settings |
| CSV Parsing        | Pandas                         |
| Server             | Uvicorn                        |
| Package Manager    | Poetry                         |
| Linter / Formatter | Ruff                           |

### Frontend

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Language        | TypeScript                   |
| UI Library      | React 18                     |
| Routing         | TanStack Router (file-based) |
| Data Grid       | AG Grid (Community)          |
| HTTP Client     | Axios                        |
| Build Tool      | Vite 5                       |
| Package Manager | npm                          |

### Infrastructure

| Component     | Technology                              |
| ------------- | --------------------------------------- |
| Orchestration | Docker Compose                          |
| Hot Reload    | `docker compose watch` (sync + rebuild) |

---

## Project Structure

```
spending-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI app, CORS, router registration
│   │   ├── config.py                        # Pydantic Settings (DATABASE_URL, ORIGIN_URL)
│   │   ├── bank_statement_parser.py         # CSV upload → Pandas → dict records
│   │   ├── transactions_service.py          # Rule-matching logic
│   │   ├── api/
│   │   │   ├── dependencies.py              # get_db session dependency
│   │   │   ├── reports/
│   │   │   │   ├── routes.py                # Reports & overrides endpoints
│   │   │   │   └── models.py                # Pydantic request/response models
│   │   │   └── rules/
│   │   │       ├── routes.py                # Categories, filters, rules endpoints
│   │   │       └── models.py                # Pydantic request/response models
│   │   └── db/
│   │       ├── base.py                      # Engine, SessionLocal, Base, ReportsBase
│   │       ├── reports/
│   │       │   ├── models.py                # Report, Category, Filter, Transaction, Override
│   │       │   └── repository.py            # Reports CRUD + report generation logic
│   │       └── rules/
│   │           ├── models.py                # Category, Filter, RuleGroup, Rule
│   │           └── repository.py            # Rules CRUD
│   ├── migrations/
│   │   ├── env.py                           # Alembic env (multi-schema support)
│   │   ├── script.py.mako                   # Migration file template
│   │   └── versions/                        # Migration scripts
│   ├── pyproject.toml
│   ├── poetry.lock
│   ├── alembic.ini
│   ├── Dockerfile
│   └── AGENTS.md
├── frontend/
│   ├── src/
│   │   ├── main.tsx                         # Entry point, TanStack Router setup
│   │   ├── App.tsx                          # Original layout (sidebar + main section)
│   │   ├── config.tsx                       # API_URL from VITE_API_URL env var
│   │   ├── index.css
│   │   ├── routeTree.gen.ts                 # Auto-generated route tree
│   │   ├── routes/
│   │   │   ├── __root.tsx                   # Root route with context providers
│   │   │   ├── index.tsx                    # / → App component
│   │   │   ├── hello.tsx                    # /hello → HelloWorld component
│   │   │   └── reports.$reportId.tsx        # /reports/:reportId → ReportView
│   │   ├── components/
│   │   │   ├── HelloWorld.tsx               # CSV upload + preview page
│   │   │   ├── ReportView.tsx               # Report detail + generation page
│   │   │   ├── MainSection.tsx              # Main content area (original UI)
│   │   │   ├── SideBar.tsx                  # Sidebar panel (original UI)
│   │   │   └── ...                          # Other UI components
│   │   ├── contexts/
│   │   │   ├── ReportsContext.tsx            # Reports state & actions
│   │   │   ├── RulesContext.tsx              # Rules/categories state & actions
│   │   │   └── ModalContext.tsx              # Modal display state
│   │   ├── hooks/                           # useReports, useRules, useModal, etc.
│   │   ├── services/
│   │   │   ├── api.types.ts                 # Shared snake_case API types
│   │   │   ├── reports/
│   │   │   │   ├── apiService.ts            # Reports HTTP client
│   │   │   │   ├── api.parser.ts            # snake_case → camelCase transforms
│   │   │   │   ├── api.types.parsed.ts      # camelCase domain types
│   │   │   │   └── apiService.parser.ts     # camelCase → snake_case for payloads
│   │   │   └── rules/
│   │   │       ├── apiService.ts            # Rules HTTP client
│   │   │       ├── api.parser.ts
│   │   │       ├── api.types.parsed.ts
│   │   │       └── apiService.parser.ts
│   │   └── lib/                             # Utility modules
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig*.json
│   ├── eslint.config.js
│   └── Dockerfile
├── docs/                                    # Documentation
├── compose.yaml                             # Docker Compose (postgres, backend, frontend)
├── Makefile                                 # Root-level make targets
└── README.md
```

---

## Database Architecture

The application uses a single PostgreSQL database with **two schemas**:

### Default schema — Rules domain

These tables store the reusable rule definitions that exist independently of any report.

| Table        | Purpose                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `category`   | Named grouping of filters (e.g. "Groceries", "Transport"). Unique name constraint.                                                                                                                     |
| `filter`     | A named matcher within a category. Has a `position` for ordering.                                                                                                                                      |
| `rule_group` | A logical group of rules applied to a filter. Operator is `AND` or `OR`.                                                                                                                               |
| `rule`       | An individual matching condition. Has a `type` (`DESCRIPTION` or `AMOUNT`), an `operator` (`EQUAL`, `NOT_EQUAL`, `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_EQUAL`, `LESS_THAN_EQUAL`), and a `value`. |

**Relationships:**

- `category` 1→N `filter` 1→N `rule_group` 1→N `rule`

### `report` schema — Reports domain

These tables store per-report data generated from uploaded bank statements.

| Table         | Purpose                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report`      | A named report created from a CSV upload. Has `schema_version`, `data` (JSONB), timestamps.                                                                                                  |
| `category`    | A snapshot of a rule category at generation time. Belongs to a report.                                                                                                                       |
| `filter`      | A snapshot of a rule filter at generation time. Belongs to a category. Has a computed `amount` property (sum of transaction amounts).                                                        |
| `transaction` | A single bank statement row. Has `schema_version`, financial fields, `raw_data` (JSONB). Linked to a report; optionally linked to a filter. Has a `source` enum (`generated` or `override`). |
| `override`    | A manual user correction linking a transaction to a specific filter. Stores `category_name` and `filter_name` so the link survives report regeneration.                                      |

**Relationships:**

- `report` 1→N `transaction`
- `report` 1→N `category` 1→N `filter` 1→N `transaction`
- `report` 1→N `override` 1→1 `transaction`

**Key design choice:** Report categories and filters are **copies** of the rule-domain entities, not foreign keys to them. This means regenerating a report creates fresh copies from the current rule definitions, and historical reports aren't affected by rule changes.

### Schema versioning

Both `report` and `transaction` tables carry a `schema_version` integer. This allows the system to evolve the data model while remaining backward-compatible with older records:

- **Version 1** — Original schema with minimal transaction fields (`description`, `amount`, `fee`, `started_date`, `completed_date`).
- **Version 2** — Extended schema adding `type`, `product`, `currency`, `state`, `balance`, and a `raw_data` JSONB field containing the original unmodified CSV row.

The API uses Pydantic discriminated unions (`TransactionV1Response` / `TransactionV2Response`) keyed on `schema_version` to serialise the correct shape.

---

## Backend Architecture

### Layers

```
HTTP Request
    │
    ▼
┌──────────────────────────┐
│  API Layer (routes.py)   │  FastAPI routers, Pydantic validation
│  models.py               │  Request/response schemas
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Repository Layer        │  All database access (CRUD operations)
│  (db/*/repository.py)    │  DTOs for create/update operations
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Domain Services         │  Business logic independent of persistence
│  transactions_service.py │  Rule matching engine
│  bank_statement_parser.py│  CSV parsing
└──────────────────────────┘
```

### API Endpoints

#### Reports (`/reports`)

| Method | Path                            | Description                                                                                                                                      |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/reports`                      | Upload a CSV bank statement and create a new report. Accepts multipart form with `file` (CSV) and `name` (string).                               |
| `GET`  | `/reports`                      | List all reports (ordered by `created_at` descending).                                                                                           |
| `GET`  | `/reports/{report_id}`          | Get a report with its full category/filter/transaction tree.                                                                                     |
| `POST` | `/reports/{report_id}/generate` | Run the rules engine against the report's transactions. Resets existing categorisation first, then applies all rules, then re-applies overrides. |

#### Overrides (`/overrides`)

| Method   | Path                          | Description                                                 |
| -------- | ----------------------------- | ----------------------------------------------------------- |
| `POST`   | `/overrides`                  | Create a manual override linking a transaction to a filter. |
| `DELETE` | `/overrides/{transaction_id}` | Remove an override and unlink the transaction.              |

#### Rules (`/categories`, `/filters`)

| Method   | Path                         | Description                                             |
| -------- | ---------------------------- | ------------------------------------------------------- |
| `POST`   | `/categories`                | Create a named category.                                |
| `GET`    | `/categories`                | List all categories with their filters and rule groups. |
| `POST`   | `/filters`                   | Create a filter with rule groups and rules.             |
| `GET`    | `/filters`                   | List all filters.                                       |
| `GET`    | `/filters/{filter_id}`       | Get a single filter with rule groups.                   |
| `PUT`    | `/filters/{filter_id}`       | Update a filter (replaces all rule groups).             |
| `DELETE` | `/filters/{filter_id}`       | Delete a filter.                                        |
| `POST`   | `/filters/{filter_id}/rules` | Add a single rule to an existing filter.                |

### CSV Parsing Flow

1. `parse_upload_file()` reads the uploaded file into a Pandas DataFrame.
2. `parse_statement()` normalises column names to `snake_case` and converts rows to dicts.
3. Each row's original (un-normalised) data is preserved in a `raw_data` field.
4. The route handler maps each dict into a `CreateReportTransactionDto` and passes it to `create_report()`.

### Report Generation Flow

When `POST /reports/{report_id}/generate` is called:

1. **Reset** — All existing report categories and filters are deleted; transactions are unlinked (`filter_id = None`, `source = generated`).
2. **Generate** — For each rule category → filter → rule group:
   - Start with all remaining (unmatched) transactions.
   - For each rule in the group, find matching transactions.
   - Intersect matches across rules within a group (AND logic).
   - Remove matched transactions from the pool and assign them to the report filter.
3. **Apply overrides** — Re-apply any manual overrides. If the override's target filter no longer exists (rule was deleted), the override is cleaned up.

### Transaction Matching

The `transactions_service` supports two rule types:

- **DESCRIPTION** — Exact case-insensitive match of the transaction description against the rule value.
- **AMOUNT** — Numeric comparison of the transaction amount against the rule value using the specified operator (`EQUAL`, `NOT_EQUAL`, `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_EQUAL`, `LESS_THAN_EQUAL`).

---

## Frontend Architecture

### Routing

The app uses **TanStack Router** with file-based route generation via the `@tanstack/router-plugin` Vite plugin. Routes are defined as files in `src/routes/` and the route tree is auto-generated into `src/routeTree.gen.ts`.

| Path                 | Component    | Description                                                                                              |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| `/`                  | `App`        | Original layout with sidebar and main section. Used for the existing rule-management UI.                 |
| `/hello`             | `HelloWorld` | CSV upload page with client-side preview (AG Grid) and report creation form.                             |
| `/reports/:reportId` | `ReportView` | Report detail page showing categorised transactions, generation controls, and unidentified transactions. |

### Component Architecture

**Root layout (`__root.tsx`)** wraps all routes in three context providers:

- `ReportsProvider` — Report list, selected report, and report CRUD actions.
- `RulesProvider` — Categories/filters state and CRUD actions.
- `ModalProvider` — Modal display state.

**HelloWorld page:**

- Left sidebar listing all reports with links to their detail pages.
- Main area with a report name input, CSV file picker, and upload button.
- Client-side CSV preview using AG Grid (parses CSV in the browser for preview only).

**ReportView page:**

- Left sidebar with report list (highlights current report) and a "New Report" link.
- Main area showing the report name, a "Generate Report" button, and the report contents.
- Categories are shown as headings with totals.
- Filters are collapsible sections containing AG Grid tables of transactions.
- Unidentified transactions are shown in their own collapsible section.

### Data Flow

```
Component
    │
    ├── (new pages) Call apiService directly
    │
    └── (original pages) useReports / useRules hooks
            │
            ▼
        Context (ReportsContext / RulesContext)
            │
            ▼
        apiService (Axios HTTP calls)
            │
            ▼
        api.parser (snake_case ↔ camelCase transforms)
```

The newer components (`HelloWorld`, `ReportView`) call `reportsApiService` directly rather than going through context, while the original UI components use React contexts via custom hooks.

### API Type System

The frontend maintains a three-layer type system:

1. **`api.types.ts`** — Raw API types matching the backend's snake_case JSON shape (`ApiTransaction`, `ApiReport`, etc.).
2. **`api.types.parsed.ts`** — Domain types in camelCase (`Transaction`, `ReportFull`, etc.).
3. **`api.parser.ts`** — Functions that convert between the two (`parseApiReport`, `parseApiReportTransaction`, etc.).

Outgoing payloads are converted from camelCase back to snake_case via `apiService.parser.ts`.

---

## Infrastructure

### Docker Compose Services

| Service    | Image / Build           | Port | Purpose                    |
| ---------- | ----------------------- | ---- | -------------------------- |
| `postgres` | `postgres:16.4-alpine`  | 5432 | PostgreSQL database        |
| `backend`  | `./backend/Dockerfile`  | 8000 | FastAPI application server |
| `frontend` | `./frontend/Dockerfile` | 5173 | Vite dev server            |

### Environment Variables

| Variable       | Service  | Description                        |
| -------------- | -------- | ---------------------------------- |
| `DATABASE_URL` | backend  | PostgreSQL connection string       |
| `ORIGIN_URL`   | backend  | Allowed CORS origin (frontend URL) |
| `VITE_API_URL` | frontend | Backend API base URL               |

### Hot Reload

Docker Compose `develop.watch` configuration:

- **Backend** — Syncs `./backend` to `/code` in the container (ignores `.venv/`). Rebuilds on `poetry.lock` changes.
- **Frontend** — Syncs `./frontend` to `/code` in the container (ignores `node_modules/`). Rebuilds on `package-lock.json` changes.

### Makefile Targets

| Target                           | Description                                               |
| -------------------------------- | --------------------------------------------------------- |
| `make up`                        | Start all services with build + watch, clean up on Ctrl+C |
| `make lint`                      | Run Ruff check and format on the backend                  |
| `make db-autogenerate msg="..."` | Auto-generate an Alembic migration                        |
| `make db-upgrade`                | Apply all pending migrations                              |

### Alembic Configuration

- Migration file template uses modern Python type hints (`str | Sequence[str] | None` instead of `Union`).
- Post-write hooks automatically run `ruff format` and `ruff check --fix` on newly generated migration files.
- The migration environment (`env.py`) combines metadata from both the default schema (`Base`) and the report schema (`ReportsBase`) to support multi-schema autogeneration.

---

## Staged Changes (Unreleased)

The following changes are currently staged in git but not yet committed. They represent two major areas of work.

### 1. Backend: Transaction Schema Versioning & Enrichment

**Motivation:** The original transaction model captured only a minimal set of fields from bank statement CSVs (`description`, `amount`, `fee`, `started_date`, `completed_date`). This update evolves the schema to capture richer data while maintaining backward compatibility with existing records.

#### Database Model Changes (`app/db/reports/models.py`)

- Added `CURRENT_REPORT_SCHEMA_VERSION` and `CURRENT_TRANSACTION_SCHEMA_VERSION` constants (both `2`).
- **Report table:** Added `schema_version` (integer, not null) and `data` (JSONB, nullable) columns.
- **Transaction table:**
  - Added `schema_version` (integer, not null, default 2).
  - Added new fields: `type`, `product`, `currency`, `state` (all nullable strings), `balance` (nullable float), `raw_data` (nullable JSONB).
  - Changed `fee` column type from `Integer` to `Float` (was a bug — fees are decimal values).
- Updated all `UUID(as_uuid=True)` calls to `UUID[uuid.UUID](as_uuid=True)` generic syntax across all models (`Report`, `Category`, `Filter`, `Transaction`, `Override`).

#### Migration (`x_2026_01_15_000841_0ace9745d299_add_jsonb_fields.py`)

- Adds new columns as nullable first.
- Backfills `schema_version = 1` for all existing report and transaction rows.
- Alters `schema_version` to non-nullable after backfill.
- Changes `transaction.fee` from `INTEGER` to `Float`.
- Provides a complete `downgrade()` path.

#### API Response Models (`app/api/reports/models.py`)

- Split the single `TransactionResponse` into two versioned models:
  - **`TransactionV1Response`** — Original fields only (`id`, `started_date`, `completed_date`, `description`, `amount`, `fee`, `source`). Tagged with `schema_version: Literal[1]`.
  - **`TransactionV2Response`** — All fields including `type`, `product`, `currency`, `state`, `balance`, `raw_data`. Tagged with `schema_version: Literal[2]`.
- Created a `TransactionResponse` discriminated union using `Field(discriminator="schema_version")`.
- Added `schema_version` to `ReportResponse` and `ReportFullResponse`.

#### CSV Parser Changes (`app/bank_statement_parser.py`)

- Removed the filter that excluded rows where `Product == "Deposit"` — all CSV rows are now kept.
- Preserves original (un-normalised) row data in a `raw_data` dict field on each record.

#### Repository Changes (`app/db/reports/repository.py`)

- `CreateReportTransactionDto` now includes all new fields (`type`, `product`, `currency`, `state`, `balance`, `raw_data`).
- `create_report()` passes all new fields through to the `Transaction` constructor.

#### Route Changes (`app/api/reports/routes.py`)

- `create_report_()` now maps all new fields from the parsed CSV records into `CreateReportTransactionDto`.

#### Tooling & Templates

- **Makefile:** Added `lint`, `db-autogenerate`, and `db-upgrade` targets.
- **`alembic.ini`:** Added `ruff_format` and `ruff_lint` post-write hooks for auto-generated migrations.
- **`script.py.mako`:** Modernised type hints (`Union[str, Sequence[str], None]` → `str | Sequence[str] | None`), updated import to use `collections.abc.Sequence`.

### 2. Frontend: TanStack Router, AG Grid, and New Pages

**Motivation:** The original frontend was a single-page application with no routing. These changes introduce file-based routing and two new pages for CSV upload and report viewing, using AG Grid for data display.

#### Routing Setup

- **`package.json`:** Added `@tanstack/react-router`, `@tanstack/router-devtools`, `@tanstack/router-plugin`, `ag-grid-community`, `ag-grid-react`.
- **`vite.config.ts`:** Added `TanStackRouterVite()` plugin for file-based route generation.
- **`main.tsx`:** Replaced the old provider-wrapped `<App />` with `<RouterProvider router={router} />`. Added TypeScript module declaration for router type safety.
- **`routeTree.gen.ts`:** Auto-generated route tree defining three routes.

#### Route Definitions

- **`__root.tsx`:** Root route wrapping all children in `ReportsProvider` → `RulesProvider` → `ModalProvider`.
- **`index.tsx`:** Maps `/` to the existing `App` component.
- **`hello.tsx`:** Maps `/hello` to the new `HelloWorld` component.
- **`reports.$reportId.tsx`:** Maps `/reports/:reportId` to the new `ReportView` component.

#### New Components

**`HelloWorld.tsx`** — CSV upload and report creation page:

- Sidebar listing existing reports with links to their detail pages.
- Report name input field and CSV file picker.
- Client-side CSV parsing and preview using AG Grid.
- Upload button that calls `reportsApiService.createReport()`.
- Success/error message display.

**`ReportView.tsx`** — Report detail and generation page:

- Sidebar with report list (current report highlighted) and "New Report" link.
- Report header with name and "Generate Report" button.
- Categories displayed as sections with aggregate totals (transaction count, total amount).
- Filters displayed as collapsible sections (`CollapsibleSection` component) containing AG Grid tables.
- Unidentified transactions section (expanded by default).
- Loading and error states.

#### Type Updates

- **`api.types.ts`:** Added `type`, `product`, `fee`, `currency`, `state`, `balance` fields to `ApiTransaction`. Changed `completed_date` to `string | null`.
- **`api.types.parsed.ts`:** Added matching camelCase fields to `Transaction`. Changed `completedDate` to `string | null`.
- **`api.parser.ts`:** Updated `parseApiReportTransaction()` to map all new fields.
