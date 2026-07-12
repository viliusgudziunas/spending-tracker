# Step 14 — Summary view toggle

Read [conventions.md](conventions.md) first. Requires step 13 (plan in summary).

## Goal

Let the user reduce noise: a page-level toggle on `/summary` switching between **Both** (default, as built in step 13), **Plan only**, and **Actual only**.

## What to build

Frontend only — the step 13 response already contains everything.

1. A segmented control / button group at the top of the summary page: Both | Plan | Actual.
2. "Plan": every month shows a single Plan column (including reported months). "Actual": single Actual column; months without actuals show blank cells. "Both": step 13 behaviour. The bottom rows (FINAL / SPENDING / SPENDING %) follow the active mode the same way as regular rows.
3. Overspend highlighting only applies in Both mode (it needs both values visible to make sense).
4. Persist the choice in the URL search params (TanStack Router `validateSearch` on the route) so it survives reloads and can be bookmarked.

## Done when

Toggling instantly switches column layout without refetching; the mode survives a page reload.

## Wrap-up

This is the final step. After committing: mark it `[COMMITTED]` in [plan.md](plan.md) and update [docs/architecture.md](../../architecture.md) to describe the plan and summary features (the repo rule about keeping the architecture doc updated applies).
