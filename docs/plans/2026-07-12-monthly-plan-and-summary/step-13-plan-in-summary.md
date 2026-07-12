# Step 13 — Plan in summary

Read [conventions.md](conventions.md) first. Requires steps 6 (plan values resolve fully), 11 (summary with kinds), 12 (plan line links).

## Goal

The summary becomes plan-vs-actual. For each month **with** a report: two sub-columns, Plan | Actual. For months **without** a report (typically future months): a single Plan column — the summary doubles as a projection.

## Backend

Extend `GET /summary` in `summary_service.py`:

1. Resolve the plan grid for the requested range by calling the same `plan_service` computation used by `GET /plan` (do not duplicate the override/percent/waterfall logic).
2. Map resolved plan line values onto summary rows via the step 12 links. Multiple lines may link to the same target — **sum** them, never last-write-wins:
   - A category row's plan for a month = sum of all lines linked to that category, plus all lines linked to any of its filters.
   - A filter row's plan = sum of all lines linked to that filter.
   - Unlinked lines don't appear in the summary at all.
   - Cover the sum-of-multiple-links case in the summary unit test (e.g. two lines linked to Food, 700 + 100 → 800).
3. Response: rows gain `plan: { "YYYY-MM": number | null }` alongside `actuals`; each month entry gains `has_actuals: bool` (report exists AND generated, per step 9); totals gain planned counterparts (planned FINAL/SPENDING/SPENDING % computed from the same category kinds).

## Frontend

1. Months with `has_actuals`: render Plan and Actual sub-columns under one month header. Months without (no report, or report uploaded but never generated): single Plan column.
2. Cells where actual exceeds plan get a subtle warning style (overspend at a glance); no styling where plan is null.
3. Keep filter-row expansion working — filter rows show plan values only where a line links to that filter, blank otherwise.

## Done when

A backfilled month shows Plan | Actual side by side with sensible numbers (Food plan 700 vs actual 902); next month's column shows only the plan; an uploaded-but-ungenerated month also shows plan only; bottom rows FINAL, SPENDING, and SPENDING % each show Plan and Actual sub-values for months with actuals.

## Out of scope

The view toggle (step 14).
