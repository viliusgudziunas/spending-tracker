# Month-by-month Breakdown View — MVP

A read-only `/breakdown` page that puts months side by side: rows are the existing spending taxonomy (category, with its filters nested underneath), columns are months, cells are that filter's total for that month. It replaces opening one report at a time to compare months, and mirrors the "Breakdown" tab of the user's budget spreadsheet.

This supersedes **Phase 2 and Phase 3** of [2026-07-12-monthly-plan-and-summary](../2026-07-12-monthly-plan-and-summary/plan.md) (steps 7–10). That design bundled actuals together with plan-vs-actual columns, a month-range picker, category kinds and FINAL/SPENDING rows; this MVP ships actuals only. Phase 1 (the `/plan` grid, steps 1–6) is unaffected and still stands.

**Required reading before implementing:** [conventions.md](../2026-07-12-monthly-plan-and-summary/conventions.md) — the codebase patterns (backend layering, migrations, money math, frontend client/hooks/sign conventions) apply unchanged here.

## Decisions made together

- **A report's month is an explicit field**, not derived from transaction dates and not parsed out of the report name. `report.month` is `YYYY-MM`, nullable (existing reports get backfilled by hand), unique (one report per month).
- **Rows are always expanded**: every category row is followed by its filter rows. No collapse/expand toggle — the sheet shows everything at once, and the category row *is* the group total.
- **Columns are automatic**: every month that has a generated report, oldest to newest. No from/to picker. Months with no report simply have no column.
- **An Unidentified row** is included so the numbers never understate what left the account.
- **Not in the MVP**: grand-total row, TSV/clipboard export, plan columns, category kinds (income/allocation/ignore exclusion), FINAL / SPENDING / SPENDING %, the sheet's year band header, its fixed-amount column, and its third grouping level (`Home → Expenses / Utilities` — the taxonomy is two levels and stays that way).
- **Naming**: the endpoint and page are `breakdown`, matching the spreadsheet tab and the fact that this is actuals only. The old design's `/summary` meant plan-vs-actual and is not being built.
- **Amounts** are formatted as EUR. Transactions carry a currency field but the MVP assumes one currency.

## The identity problem (read this before writing the merge)

`report_service._generate_report` mints **fresh UUIDs for snapshot categories and filters on every generate**, and copies category/filter *names* as they were at generate time. A current snapshot id cannot line a row up across months. The exception is a legacy snapshot whose `id` and `rule_filter_id` are the same value: that id was never a live filter id, so the row is lined up by the current filter name instead. Getting this wrong doesn't produce an error — it silently splits one row into two, or drops money off the grid.

Rules:

| Concern | Rule |
| --- | --- |
| Rule-filter row identity | Merge by `rule_filter_id` when it is a live `Filter.id`, or a real historical id that differs from the snapshot filter id. |
| Legacy snapshots | Reports migrated from the v1 snapshot tables stored the snapshot id in both `id` and `rule_filter_id`. Those rows merge by the current filter name, which is unique, so the money follows that live filter's id, category, and name even if the old category differed. If no live filter has the name, every month of that name shares `legacy:{resolved category id}:{snapshot name}`. |
| Manual-filter row identity | Merge by `(report.data.manual_filters[].category_id, name)`. That `category_id` is a live `Category.id`; the manual filter's own id is per-report and cannot merge. Name alone collides across categories. |
| Row key in the response | Namespaced so a rule filter and a manual filter with the same name stay distinct rows and both count toward the category total: `rule:{rule_filter_id}` / `manual:{category_id}:{name}` / `legacy:{category_id}:{name}`. |
| Category placement | Live `Filter.category_id` when the filter still exists. Otherwise resolve the live `Category` by the snapshot's category name (for deleted filters) or by `category_id` (for manuals). |
| Category row identity | The **live** category's `id`, `name` and `position` whenever one was matched — so a rename shows up immediately, without regenerating old reports. |
| Deleted filters | Keep their money. The row survives under its resolved live category, labelled with the snapshot name. A ghost category row is emitted only when the category name is gone too (rename-then-delete). |
| Recreated filters | A filter deleted and recreated under the same name has a new `Filter.id`, and the old snapshot's `rule_filter_id` still differs from its snapshot id, so the old money keeps its own `rule:{id}` row. |

`Category` has no delete endpoint today, so the common case is a deleted *filter* whose live parent category still exists. That case must produce **one** category row, not a live row plus a snapshot row.

## Backend

`GET /breakdown` lives on the existing **report** domain — `breakdown_routes.py` for the top-level path (still tagged Reports in OpenAPI, not a fifth domain), `breakdown_schemas.py` for the response models — because it is one read-only endpoint over report data, not a new CRUD aggregate. Only the merge logic earns its own module, `breakdown_service.py`, to keep it out of the already-long `report_service.py`.

Response:

```json
{
  "months": ["2025-10", "2025-11"],
  "categories": [
    {
      "id": "<live category uuid>",
      "name": "Home",
      "position": 3,
      "amounts": { "2025-10": "-1686.94", "2025-11": "-2896.65" },
      "filters": [
        {
          "key": "rule:<live filter uuid>",
          "name": "Mortgage",
          "position": 1,
          "amounts": { "2025-10": "-959.23", "2025-11": "-959.23" }
        }
      ]
    }
  ],
  "unidentified": { "amounts": { "2025-10": "-24.10", "2025-11": "0" } }
}
```

- **Months** = reports with a non-null `month` **and** non-null `data`, ascending. An uploaded-but-never-generated report is not a month with zero spending — it has no column at all.
- **Amounts** come from `report_service.build_report_full_response()`, which already resolves per-filter totals including manual filters and manual assignments, plus the unidentified set. Do not write a second parser of `report.data` — the breakdown must be defined to agree with what the report detail page shows.
- A row absent from a generated month is `0` for that month, not null; every listed month has a real report behind it.
- `Decimal` throughout, DB sign preserved (debits negative). The frontend flips once at parse time, like `ReportFilterSchema` already does.

Duplicate months must fail the same way on both write paths: `IntegrityError` → rollback → `DuplicateReportMonthError` in `report_repository` (mirroring `DuplicateCategoryError`), mapped to 400 on **both** `POST /reports` and `PATCH /reports/{id}`. Uploading a statement for a month that already has one is the realistic mistake, and it must not surface as a 500.

## Frontend

- `fetchBreakdown()` on `BackendClient`; Zod parser flips amounts to positive-spending exactly once.
- `BREAKDOWN_QUERY_KEY` and `useBreakdownQuery()` sit in `useReportsQueries.ts` next to the mutations that invalidate them (patch, generate, create, delete) rather than in their own hooks file.
- `routes/_app/breakdown.tsx` → `components/breakdown/BreakdownPage.tsx`, AG Grid with a pinned-left row-label column and dynamically generated month columns; flat row data (bold category row, then indented filter rows, Unidentified last). EUR via `Intl.NumberFormat` in the month column's `valueFormatter`.
- The **empty state matters**: on the first visit after shipping, every existing report is excluded (no month yet, and possibly never generated). The copy has to name both gates — set a month on a report, and generate it — or the page reads as broken.
- Sidebar gets a "Breakdown" link, and shows each report's month with month-less reports flagged so the backfill work is visible.

## Build order

Each step is one commit: working app, no dead code, something visible in the UI. Status tags: `[PENDING]`, `[IN PROGRESS]`, `[COMMITTED]`.

### Step 1 — Report month, backend [IN PROGRESS]

`Report.month` (nullable, unique) + migration with a working downgrade; a regex-constrained `MonthKey` type; `PATCH /reports/{id}` accepts it; `month` in both report response schemas; `DuplicateReportMonthError` on update → 400.

**Done when** an integration test covers patching a month, a bad format (422), and a duplicate (400).

### Step 2 — Month on upload [IN PROGRESS]

`POST /reports` requires a `month`, with the same duplicate handling and 400 mapping as the patch path. The column stays nullable so existing reports can still be backfilled.

**Done when** uploading with a month returns it, and a second upload for the same month gets a 400 with the same detail as the patch route.

### Step 3 — Month plumbing + backfill UI [IN PROGRESS]

Frontend `month` through the Zod schemas, parsers and payload types; an `<input type="month">` beside the report name on the detail page that patches and surfaces the taken-month error.

**Done when** a month set on an existing report persists across a reload, and reusing a taken month shows the backend message.

### Step 4 — Month at upload + sidebar visibility [IN PROGRESS]

Month input on the upload form defaulting to the previous calendar month (statements are uploaded after the month ends) and required, matching `POST /reports`; month shown beside each report in the sidebar with month-less reports flagged.

**Done when** a freshly uploaded report shows its month without a second edit, and a duplicate-month upload shows the backend detail in the existing error banner.

### Step 5 — Breakdown endpoint [IN PROGRESS]

`GET /breakdown` per the response shape and identity rules above.

Note: the route lives in `breakdown_routes.py` rather than `report_routes.py`, because `/breakdown` is not a `/reports` path. It is still the Reports domain (`tags=["Reports"]`); response models live in `breakdown_schemas.py`.

**Done when** an integration test covers: two months merging by `rule_filter_id` across a filter rename; a deleted filter with a surviving sibling producing one category row whose filters sum to the report-detail total; a manual filter staying one row under the live category after a category rename without regenerating the older month; a same-named rule and manual filter staying distinct; and the Unidentified sum.

### Step 6 — Breakdown data layer [IN PROGRESS]

Client method, Zod parser with the sign flip, query key, hook, and invalidation from the report mutations.

**Done when** regenerating a report or changing its month refetches the breakdown.

### Step 7 — Breakdown page [IN PROGRESS]

The route, page, grid, formatting, loading/error/empty states, and the sidebar link.

**Done when** with two months backfilled, a category's per-month totals match those months' report detail pages and its filter rows sum to the category row; with no eligible reports, the empty state explains what to do.

### Step 8 — Docs [IN PROGRESS]

`docs/architecture.md`: `GET /breakdown` under the Reports domain (not a fifth domain), `report.month` in the Reports table section, the `/breakdown` page in the routing table, `components/breakdown/` in the components list.
