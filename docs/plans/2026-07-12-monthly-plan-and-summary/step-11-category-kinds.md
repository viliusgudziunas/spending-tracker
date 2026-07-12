# Step 11 — Category kinds + FINAL / SPENDING rows

Read [conventions.md](conventions.md) first. Requires step 9 (summary exists; step 10 recommended).

## Goal

Classify categories so the summary can compute its bottom rows. Kinds: `income` (money in), `spending` (consumption), `allocation` (money out but not consumed — Investments, Savings), `ignore` (excluded entirely, e.g. internal transfers). Then: **FINAL** = allocation + spending totals per month, **SPENDING** = spending only, **SPENDING %** = SPENDING / FINAL. Income and ignore rows disappear from the summary grid.

## Backend

1. Add to `Category` in `backend/app/db/models.py`: `kind` — StrEnum `CategoryKind` (`income | spending | allocation | ignore`), not null, default `spending`.
2. Migration with backfill by current category name: `Income` → income, `Ignore` → ignore, `Investments` and `Savings` → allocation, everything else → spending. The name match is best-effort (names are user-editable) — unmatched categories default to `spending`, and the user verifies kinds in the categories panel afterwards (part of Done when).
3. `PATCH /categories/{id}` and `POST /categories` accept `kind`; include it in category responses (`category_schemas.py`).
4. `GET /summary` changes in `summary_service.py`:
   - Exclude `income` and `ignore` categories from the grid rows (keep the exclusion backend-side).
   - Add per-month `totals: { final, spending, spending_pct }` computed from kinds. The Unidentified row counts into both `final` and `spending`. `spending_pct` = spending / final (null when final is 0 or the month has no actuals).

## Frontend

1. Categories panel (`frontend/src/components/categories-panel/`): kind selector on each category (dropdown next to the name or in its edit state). Update Zod schema, client, hooks.
2. Summary page: three pinned/bold bottom rows — FINAL, SPENDING, SPENDING % (percentage formatted, e.g. `73.2%`).

## Done when

Each category shows the right kind in the categories panel — **verify every kind by hand after the migration** (the backfill matches by name and names may have drifted); the summary no longer lists Income/Ignore; the bottom shows FINAL / SPENDING / SPENDING % per month, matching the user's sheet semantics (a month where everything spent is consumption shows 100%).

## Out of scope

Plan integration (steps 12–13).
