# Step 3 — Month columns + fixed defaults

Read [conventions.md](conventions.md) first. Requires step 2 (plan lines).

## Goal

Turn `/plan` into a real budget grid. Lines get an optional **fixed default amount** (the user's "column C": e.g. Groceries defaults to 700 every month). The page gains **month columns**: pick a month range, and every line shows its default in every month. This is the first step where the page looks like the user's spreadsheet.

## Backend

1. Extend `PlanLine` in `backend/app/db/models.py`:
   - `default_kind`: StrEnum `PlanLineDefaultKind` with **all three** values `none | fixed | percent`, not null, default `none`. `percent` stays unused until step 6, but creating the full Postgres enum now avoids a risky `ALTER TYPE ... ADD VALUE` migration later.
   - `default_value`: nullable float. Semantics: when `default_kind = fixed`, `default_value` is the monthly amount; when `none`, the line has no default and months are blank.
2. Migration (backfill existing rows to `default_kind = 'none'`).
3. API: `PATCH /plan/lines/{id}` additionally accepts `default_kind` + `default_value` (validate: `fixed` requires a value; reject `percent` with a 400 until step 6 enables it).
4. New endpoint `GET /plan?from=YYYY-MM&to=YYYY-MM` in `plan_routes.py`, computed in `plan_service.py`. Validate `from`/`to` with the shared month helper (see conventions.md). Resolution is intentionally trivial in this step — the endpoint exists so steps 4–6 extend one builder instead of swapping the frontend's data source:
   - Returns the grid: sections (with `is_income`) → lines → per-month resolved amount. For now resolution is trivial: fixed default or null. Structure it as `{ months: ["2026-01", ...], sections: [{ ..., lines: [{ ..., values: { "2026-01": { amount, ... } } }] }] }` — later steps add override flags and computed rows to this same response, so keep the service function as the single place where grid values are computed.
   - Also include a per-section per-month total (sum of line amounts, nulls as 0).

## Frontend

1. `PlanPage` becomes a grid: first column = section/line names (sections as header rows, lines under them, per-section total row), one column per month in the selected range. A simple month-range picker (from/to month inputs or prev/next buttons) defaults to something sensible, e.g. current month − 1 to current month + 10. Persisting the range choice is not required.
2. Line management from steps 1–2 stays reachable (e.g. row hover actions or an "edit" affordance per row) — don't regress it.
3. UI to set a line's default: e.g. clicking the line name opens its settings where the user picks "no default" or "fixed amount" + value.
4. Grid cells are read-only this step and all show the default (or blank).
5. From this step on, `PlanPage` reads **only** `GET /plan` (single `PLAN_QUERY_KEY`); all section/line mutations invalidate it. Do not keep a separate sections-list query hook for display.

The plan grid is **hand-rolled** (plain HTML table or CSS grid with a sticky first column) — decided, not open: it has mixed row types (section headers, lines, totals, later left-over rows) that AG Grid Community cannot group. Keep this approach for all later plan-page steps.

## Done when

`/plan` shows months as columns; setting Groceries to fixed 700 makes 700 appear in every month column; section totals update; changing the month range re-fetches.

## Out of scope

Editing individual month cells (step 4), left-over rows (step 5), percent defaults (step 6).
