# Step 7 — Month on existing reports

Read [conventions.md](conventions.md) first. Independent of Phase 1 (steps 1–6).

## Goal

Reports become tied to calendar months. Today a report only has a free-text name; the month-by-month summary (Phase 3) needs to know which month each report covers. One report = one month, enforced. Existing reports get their month assigned by hand through the UI.

## Backend

1. Add to `Report` in `backend/app/db/models.py`: `month` (str `YYYY-MM`, **nullable**, unique). Nullable because existing reports have no month until the user backfills them; unique enforces one report per month.
2. Migration (no data backfill — the user assigns months manually).
3. `PATCH /reports/{report_id}` (existing rename endpoint in `report_routes.py`) additionally accepts `month`. Validate the `YYYY-MM` format with the shared month helper. Duplicate month: follow the existing duplicate pattern — add `DuplicateReportMonthError` to `repositories/exceptions.py`, catch the `IntegrityError` in `report_repository` (mirror `category_repository`'s `DuplicateCategoryError`), return 400 with a clear detail message from the route.
4. Include `month` in report responses (`report_schemas.py`, both list and full variants).

## Frontend

1. Zod schemas + client: `Report` gains `month: string | null`; `patchReport` accepts it.
2. Report detail page (`frontend/src/components/report-detail/ReportDetailPage.tsx`): an editable month field next to the report name — `<input type="month">` is enough. Saving PATCHes; a taken-month error is surfaced to the user. (From step 9 on, the patch and generate mutations must also invalidate `SUMMARY_QUERY_KEY` — step 9 wires that.)
3. Sidebar (`AppSidebar.tsx`): show the month next to each report name when set (e.g. "2026-01"); reports without a month are visually flagged so the user notices what still needs backfilling.

## Done when

You can open each existing report, set its month, see it in the sidebar; assigning an already-taken month shows a friendly error.

## Out of scope

Setting the month at upload time (step 8), any summary usage (step 9+).
