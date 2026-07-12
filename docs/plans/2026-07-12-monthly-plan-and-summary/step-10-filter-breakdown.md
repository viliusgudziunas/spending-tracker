# Step 10 — Filter breakdown

Read [conventions.md](conventions.md) first. Requires step 9 (actuals summary).

## Goal

Category rows in the summary expand to show **per-filter actuals** — the user wants to see not just "Food: 902" but where it went (Barbora 303, Lidl 156, ...). This mirrors the leaf rows of their summary spreadsheet.

## Backend

Extend the `GET /summary` response: each category gains `filters: [{ id, name, position, actuals: { "YYYY-MM": number | null } }]`. Amounts come from the same shared resolution as step 9 — this is just passing the per-filter level through instead of only the category sum. Merging rows across months follows step 9's identity rules:

- Rule filters merge by `rule_filter_id` (stable across regenerations — snapshot filter UUIDs are NOT stable, never merge on them).
- Manual filters merge by `(category_id, name)` — name alone can collide across categories.
- Filters that exist in old reports' snapshots but were deleted from the live taxonomy still get a row (snapshot name, under their step 9-resolved category) so no money disappears from the breakdown.

## Frontend

1. Category rows get an expand/collapse toggle; expanded categories show indented filter rows with their per-month amounts.
2. Filters with no spending in the whole selected range can be hidden to reduce noise.
3. Collapse state is client-side only (no persistence needed).

Note: AG Grid Community has no tree data — implement expansion by conditionally including filter rows in the row data (flat list with an `indent` flag), or with the hand-rolled table if that's what the summary uses.

## Done when

Expanding Food on `/summary` shows the store-level breakdown per month, and the filter rows sum to the category row.

## Out of scope

FINAL/SPENDING rows (step 11), plan values (step 13).
