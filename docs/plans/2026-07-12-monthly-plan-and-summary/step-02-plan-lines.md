# Step 2 — Plan lines

Read [conventions.md](conventions.md) first. Requires step 1 (plan sections).

**Status: committed and pushed on 2026-10-29 in `8f082e2` (Add editable rows within plan sections).**

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

## Implemented interactions

- “+ Add row” opens a name form inside its section; “+ Add section” opens the section form. Saving or cancelling closes the form; failed saves retain the input.
- Each row supports inline Edit/Save/Cancel, up/down moves within its section, and Delete with confirmation. The first/last row disables moves beyond the section; add/move/delete requests from this page are serialized within a section until refresh completes.
- Row storage uses migration `c9b2d6e4f801`. The API trims names, rejects blank names and invalid positions, appends new rows, keeps positions contiguous after moves/deletions, and cascades section deletion to its rows.

## Verification

User-verified on `/plan`: adding rows, collapsible creation forms, renaming, reordering, deleting, cancellation, and persistence after refresh. Automated API coverage also verifies validation, unknown IDs, independent section ordering, and section-deletion cascading.

QA follow-up: adding a row now shares the move/delete pending guard, preventing overlapping position changes from this page. Awaiting user browser check with a slow network: add/move/delete must stay disabled in the affected section until the pending request and refresh finish.

- From `backend/`: `poetry run pytest tests/integration/api/routes/test_plan_routes.py -q` — 46 passed (24 row cases and 22 section regressions).
- From `frontend/`: `npm run test -- src/clients/backendClient/planResponseParsers.test.ts` — 2 passed.
- Backend Ruff lint/format checks and `poetry run ty check` passed. Frontend ESLint, Prettier, and `npm run build` passed; the existing large-bundle warning remains.
- Migration upgrade/downgrade/re-upgrade was verified with a temporary database; the local development database has been upgraded. Other environments still need their normal migration rollout.
