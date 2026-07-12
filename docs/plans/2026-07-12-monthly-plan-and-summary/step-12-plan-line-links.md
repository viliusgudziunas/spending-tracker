# Step 12 — Plan line links

Read [conventions.md](conventions.md) first. Requires steps 2 (plan lines) and is consumed by step 13. Builds on the plan page.

## Goal

Connect the plan to the actuals taxonomy: a plan line can optionally link to **either a category or a filter**. Examples from the user: the "Food" plan line links to the whole `Food` category (they budget food as one number); the "Mortgage" plan line links to the `Mortgage` filter (a single item inside Home). Unlinked lines (e.g. the Simai/Viliui split) are fine and stay plan-only. Step 13 uses these links to place plan values next to actuals in the summary.

## Backend

1. Add to `PlanLine` in `backend/app/db/models.py`: nullable `category_id` (FK → `category.id`) and `filter_id` (FK → `filter.id`), both `ondelete="SET NULL"` so deleting taxonomy doesn't break the plan. At most one of the two may be set — validate in the service layer.
2. Migration.
3. `PATCH /plan/lines/{id}` accepts `category_id` / `filter_id` (setting one clears the other; both null = unlink). Verify the referenced row exists before writing — call `category_repository.get_category` / `filter_repository.get_filter` and return 404 if missing (mirror how `report_service.upsert_transaction_assignment` validates its targets) rather than relying on a raw FK error. Include the ids in plan responses.

## Frontend

1. Line settings on the plan page gain a link picker: a searchable select over "Categories" and their "Filters" (data already available via `useCategoriesQuery`). One control choosing either level, with a clear "no link" option.
2. Linked lines show a small indicator in the grid's name column (e.g. the linked name if it differs, or a link icon with tooltip).

## Done when

You can link the Food plan line to the Food category and the Mortgage line to the Mortgage filter; links persist and survive; deleting a filter from the taxonomy leaves the plan line intact but unlinked.

## Out of scope

Using the links for anything (step 13).
