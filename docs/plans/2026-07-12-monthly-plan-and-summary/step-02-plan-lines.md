# Step 2 — Plan lines

Read [conventions.md](conventions.md) first. Requires step 1 (plan sections).

## Goal

Sections get their content: **plan lines** — the individual budget items inside a section (e.g. Mortgage, Groceries, Kindergarten inside their sections). Still no amounts; this step is only about the row structure of the future grid.

## Backend

1. New model `PlanLine` in `backend/app/db/models.py`:
   - `id` (UUID pk), `name` (str, not null), `position` (int, not null), `section_id` (UUID FK → `plan_section.id`, `ondelete="CASCADE"`, not null).
   - Relationship `PlanSection.lines` ordered by position, `cascade="all, delete-orphan"` (mirror `Category.filters`).
2. Migration.
3. Extend the plan repository/service/schemas/routes:
   - `GET /plan/sections` now returns each section with its nested `lines`.
   - `POST /plan/sections/{section_id}/lines` — create (name; position appended).
   - `PATCH /plan/lines/{id}` — rename / reposition (reordering within its section is enough; moving between sections is not needed).
   - `DELETE /plan/lines/{id}`.

## Frontend

1. Extend the Zod schemas (section now has `lines`), client methods, and `usePlanQueries.ts`.
2. On `PlanPage`, each section shows its lines: add / rename / reorder / delete, same interaction style as sections in step 1.

## Done when

You can recreate the row structure of the user's planning sheet on `/plan` — e.g. section Home containing lines Mortgage, Renovation, Parents Loan, Insurance, Utilities — and it persists. Deleting a section removes its lines.

## Out of scope

Default amounts and month columns (step 3), links to categories/filters (step 12).
