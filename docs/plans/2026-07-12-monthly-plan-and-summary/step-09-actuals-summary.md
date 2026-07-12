# Step 9 — Actuals summary v1

Read [conventions.md](conventions.md) first. Requires step 7 (reports have months). Does not depend on the plan feature.

## Goal

First version of the month-by-month **summary page**: months as columns, spending categories as rows, each cell = that category's actual total from the month's report. This replaces scanning individual reports to compare months.

## Backend

New `summary_service.py`, `summary_schemas.py`, `summary_routes.py` (register in `main.py`):

`GET /summary?from=YYYY-MM&to=YYYY-MM` (validate the range with the shared month helper):

1. Fetch reports whose `month` is in range. A month counts as having actuals only if its report exists **and has been generated** (`report.data` is not null) — an uploaded-but-ungenerated report is treated like a missing month, not like a month with zero spending. Months without actuals appear in the response with empty data (the frontend still renders the column).
2. For each generated report, aggregate actuals from `report.data` (JSONB) — the generated categorisation with shape `categories[].filters[].transaction_ids` plus `manual_filters` / `manual_assignments`. **Reuse the existing aggregation logic**: `report_service.build_report_full_response()` already resolves per-filter amounts (including manual filters and assignments); refactor so summary and report detail share that resolution rather than re-implementing it. Use `Decimal` per conventions.md.
3. Map snapshot amounts onto **live taxonomy rows by stable identity, never by snapshot UUIDs or snapshot category names** (report generation assigns fresh category/filter UUIDs each time):
   - Rule filters: `report.data` filter → `rule_filter_id` → live `Filter` row → its live `Category`.
   - Manual filters: map via `report.data.manual_filters[].category_id` (a live-taxonomy UUID), not the snapshot's category name.
   - A `rule_filter_id` whose filter was since deleted from the taxonomy must not lose its money: attribute its amount to the snapshot's parent category (matched to a live category, or an extra "removed" row) so category totals stay truthful.
4. Include an **Unidentified** row: per report, transactions not assigned to any filter (compare against the report's transaction set, as `build_report_full_response` does for its unidentified section) sum into a dedicated row per month.
5. Response shape: `{ months: [...], categories: [{ id, name, position, actuals: { "YYYY-MM": number | null } }], unidentified: { "YYYY-MM": number | null } }` — null for months without actuals. Amounts stay in DB sign (debits negative); the frontend flips at parse time like report detail does. Include all categories in position order; filter-level breakdown comes in step 10.

## Frontend

1. New route `frontend/src/routes/_app/summary.tsx` + `SummaryPage` component (new folder `frontend/src/components/summary/`), sidebar link "Summary". Loading/error handling follows `ReportDetailPage` (loading placeholder, error banner).
2. Zod parser flips amounts to positive-spending at parse time (same convention as `ReportFilterSchema` — do not double-flip).
3. Month range picker (same pattern as the plan page; default e.g. last 6 months). Grid: category rows plus the Unidentified row at the bottom of the category list, month columns, read-only cells, right-aligned amounts, blank cells for months without actuals.
4. Use AG Grid (uniform read-only rows — this is the decided approach for `/summary`; the hand-rolled table is only for `/plan`).
5. Define `SUMMARY_QUERY_KEY`; wire `usePatchReportMutation` and `useGenerateReportMutation` (in `useReportsQueries.ts`) to invalidate it, so changing a report's month or regenerating updates the summary.

## Done when

`/summary` shows real numbers: pick a range covering backfilled reports and see e.g. Food's total per month side by side, matching the totals visible on each report's detail page.

## Out of scope

Filter breakdown (step 10), income/ignore exclusion and FINAL/SPENDING rows (step 11), plan columns (step 13).
