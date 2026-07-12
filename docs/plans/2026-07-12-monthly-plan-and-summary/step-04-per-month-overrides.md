# Step 4 — Per-month overrides

Read [conventions.md](conventions.md) first. Requires step 3 (grid + fixed defaults).

## Goal

Make individual cells editable. A cell edit creates a **per-month override** that beats the line's default for that month only (e.g. Groceries defaults to 700 but December is set to 800). Lines without a default get their values entered this way too. Overridden cells are visually distinct and can be reverted to the default.

## Backend

1. New model `PlanValue` in `backend/app/db/models.py`:
   - `id` (UUID pk), `line_id` (UUID FK → `plan_line.id`, `ondelete="CASCADE"`, not null), `month` (str `YYYY-MM`, not null), `amount` (float, not null).
   - Unique constraint on `(line_id, month)`.
   - Only overrides/manual entries are stored — defaults are never persisted.
2. Migration.
3. Endpoints (validate the `{month}` path param with the shared month helper — never persist a malformed month key):
   - `PUT /plan/lines/{line_id}/values/{month}` — body `{ amount }`; upsert the override.
   - `DELETE /plan/lines/{line_id}/values/{month}` — remove the override (cell falls back to the default, or blank).
4. `GET /plan` resolution in `plan_service.py` becomes: override if present, else default, else null. Each cell in the response gains `is_override: bool`.

## Frontend

1. Cells become clickable: click → inline number input → save on Enter/blur (PUT), Escape cancels. Empty input on an overridden cell = revert (DELETE); empty input on a non-overridden cell just cancels (no API call). An explicit `0` requires typing 0 and saving.
2. On PUT/DELETE failure, keep the editor open and show the API error (don't invalidate the grid, so the user's input isn't lost).
3. Overridden cells get a distinct style (e.g. background tint or corner marker) and a revert action (e.g. small button in the cell or context menu).
4. Invalidate the plan grid query after successful mutations so totals recompute.

## Done when

You can set December Groceries to 800 while other months stay 700; the cell is visibly marked as overridden; reverting restores 700; values persist across reloads.

## Out of scope

Left-over rows (step 5), percent defaults (step 6).
