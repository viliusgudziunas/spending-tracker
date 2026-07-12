# Step 1 — Plan sections

Read [conventions.md](conventions.md) first.

## Goal

Introduce the first piece of the monthly plan feature: **plan sections** — the ordered groups of the budget waterfall (e.g. Profit, Investments, Savings, Home). Ship a new `/plan` page where the user can manage them. No lines, no values, no months yet — just sections.

## Backend

1. New model `PlanSection` in `backend/app/db/models.py`:
   - `id` (UUID pk), `name` (str, not null), `position` (int, not null), `is_income` (bool, not null, default false).
   - `is_income` marks the income section (the user's "Profit"); the waterfall computation in a later step subtracts everything else from it. Multiple income sections aren't expected but don't need to be prevented.
2. Migration via `make db-autogenerate`, then `make db-upgrade`.
3. New `plan_section_repository.py`, `plan_service.py` (thin for now), `plan_schemas.py`, `plan_routes.py` (register in `main.py`):
   - `GET /plan/sections` — list ordered by position.
   - `POST /plan/sections` — create (name, is_income; position appended at the end).
   - `PATCH /plan/sections/{id}` — update name, position and/or is_income. Follow the position-reordering behaviour of `category_routes.py`/`category_service.py` (categories already support drag-reorder).
   - `DELETE /plan/sections/{id}`.

## Frontend

1. Client methods + Zod schema (`PlanSection`: id, name, position, isIncome) + `usePlanQueries.ts` hooks.
2. New route `frontend/src/routes/_app/plan.tsx` rendering a `PlanPage` component (new folder `frontend/src/components/plan/`).
3. `PlanPage` v1: vertical list of sections in position order — add (name input + income checkbox), rename inline, reorder (up/down buttons or drag like the categories panel), delete with confirm. Mark the income section visually (e.g. badge).
4. Add a "Plan" link in `AppSidebar.tsx`.
5. Loading/error handling follows `ReportDetailPage`: loading placeholder while the query is pending, error banner on fetch failure, mutation errors surfaced inline.

## Done when

You can open `/plan` from the sidebar, create the sections from the user's sheet (Profit as income, then Investments, Savings, Home, Food, Children, Car, Other, Split, Personal), reorder/rename/delete them, and they persist across reloads.

## Out of scope

Lines inside sections (step 2), month columns and values (step 3+), waterfall math (step 5).
