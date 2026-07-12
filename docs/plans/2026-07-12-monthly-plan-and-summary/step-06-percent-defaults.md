# Step 6 — Percent defaults

Read [conventions.md](conventions.md) first. Requires step 5 (waterfall).

## Goal

Some budget lines are defined as a percentage instead of a fixed amount — e.g. Retirement = 12% of total income, or the Simai/Viliui split = 60%/40% of what's left at that point. The base of the percentage is always **the left-over row directly above the line's section** (for the first non-income section, that's the income total). Percent defaults recompute live whenever anything above them changes; a per-month override (step 4) still beats them.

## Backend

1. The `percent` enum value already exists in the DB (created in step 3) — no migration needed. When `default_kind = percent`, `default_value` holds the percentage (e.g. `12` for 12%).
2. `PATCH /plan/lines/{id}` now accepts `percent` (remove the step 3 rejection; validate: `percent` requires a value).
3. Resolution order in `plan_service.py` per cell: override → percent (base × value / 100) → fixed → null. The base for a line = the running left-over *before* its section is subtracted (i.e. income total for the first non-income section, previous section's left-over otherwise).
   - Note the interdependence: percent lines contribute to their own section's total, which feeds the next left-over. Compute sections strictly in position order — the base for a section is fully known before its lines resolve. Percent lines in an income section have no base; resolve them as null.
4. Extend the waterfall unit test with a percent line (e.g. income 1,000; first section has a 12% line → 120; left-over 880; next section a 50% line → 440).

## Frontend

1. Line settings (from step 3) gain the percent option: kind selector `none | fixed | percent` + value input, shown with a `%` suffix for percent.
2. Percent-derived cells display the computed amount like any other cell. Show the percentage in the row label area (like the user's sheet, e.g. "Retirement — 12%"), so it's clear the amounts are derived.
3. Cell overrides keep working on percent lines and show the override styling.

## Done when

Setting Retirement to 12% fills each month with 12% of that month's income; editing an income cell instantly changes Retirement and all left-over rows below; a manual override on one month sticks.

## Out of scope

Anything summary-related. This completes Phase 1 — the plan grid is fully usable.
