# Step 5 — Waterfall (Left over rows)

Read [conventions.md](conventions.md) first. Requires step 4 (per-month values resolve correctly).

## Goal

The signature feature of the user's planning sheet: after each non-income section, a computed **"Left over"** row shows how much of the month's income remains after subtracting every non-income section so far. Example: income 7,793; after Investments (1,598) left over 6,195; after Savings (713) left over 5,482; and so on down the sheet.

## Backend

All computation in `plan_service.py` (single source of truth), inside the existing `GET /plan` grid builder:

1. Income total per month = section total of the section(s) with `is_income = true`.
2. Walk the remaining sections in position order; running value starts at the income total; after each section subtract its total and emit `left_over` for that section per month.
3. Add to the response: per non-income section a `left_over: { "YYYY-MM": number }` map. Income sections don't get one.
4. Treat null/blank cells as 0. Values can go negative — that's fine, it means the plan overshoots income.
5. Do the arithmetic with `Decimal` per conventions.md (float chains accumulate error down the waterfall); round at serialization only.

Add a unit test for the waterfall math in `backend/tests/unit/services/` (a couple of sections, mixed defaults and overrides, one month is enough).

## Frontend

1. Render a "Left over" row after each non-income section, styled differently from line rows (like the bold rows in the user's sheet). Cells are read-only/computed.
2. Negative left-over values should be visually flagged (e.g. red text) — that's the "you've planned more than you earn" signal.

## Done when

`/plan` reproduces the waterfall of the user's sheet: an income section at top, and after each following section a Left over row that updates immediately when any cell above it changes.

## Out of scope

Percent defaults (step 6) — they consume the left-over values computed here.
