# Step 3 — Fixed amounts, then month columns

Read [conventions.md](conventions.md) first. Requires step 2 (plan lines), committed in `8f082e2`.

The original combined step is split into two reviewable feature slices. Only **3a** is currently authorized for implementation; **3b** remains later work.

## Step 3a — Fixed amounts and section totals [IMPLEMENTED]

Let the current `/plan` page hold an optional fixed monthly euro amount for each row. Mortgage can hold €1,034.89 and Groceries €700.00; if both belong to one section, its total is €1,734.89. Existing rows remain unset until edited.

### Money and PATCH contract

- Add only nullable `PlanLine.fixed_amount`, stored as PostgreSQL `NUMERIC(12,2)` and handled as Python `Decimal`. Do not add `default_kind`, `default_value`, or a percentage enum yet.
- Amounts range from `0.00` to `9999999999.99`, inclusive. Income and expense sections both use non-negative amounts; do not apply report debit-sign conversion.
- API input is a decimal string or null. Accept at most two decimal places; reject negative values, excess precision (including `"1.230"`), overflow, non-finite strings, exponent notation, commas, empty strings, JSON numbers, and booleans with 422. Never silently round.
- Responses always include `fixed_amount` as a two-decimal string (e.g. `"1034.89"`, `"700.00"`, `"0.00"`) or null. Null is unset; zero is an explicit amount.
- PATCH omission preserves the saved amount, `{"fixed_amount": null}` clears it, and a decimal string sets or replaces it. An amount-only PATCH is valid. Rename/reorder requests must not overwrite an omitted amount; combined updates are atomic.
- Preserve existing name/position validation and not-found responses. Invalid input must not persist a valid rename included in the same request.

### Backend

1. Add the nullable column with no zero backfill. Verify migration upgrade/downgrade/re-upgrade on a disposable database containing existing rows; retain their names, positions, and section relationships.
2. Extend the existing `PATCH /plan/lines/{id}` through route → service → repository. Change only supplied fields and distinguish omission from explicit null at the request boundary.
3. Include the amount in all line responses, including nested `GET /plan/sections` responses. Row creation stays name-only and returns an unset amount. Keep the current endpoint and query shape; no month-grid endpoint in this slice.

### Frontend

1. Validate responses through the typed client/parser boundary and convert amounts to `fixedAmountCents: number | null`. Serialize integer cents back to decimal strings for writes.
2. Show a right-aligned monthly amount beside each row: `—` for unset and `€0.00` for explicit zero. Extend the existing row Edit form with an optional amount input and Save/Cancel; keep drafts local and row editors independent.
3. The form accepts a decimal dot or comma, with no grouping separators or currency symbol. Trim surrounding whitespace; blank/whitespace means clear. Normalize valid input before sending; apply the same range and precision limits as the API.
4. Send only changed fields. Cancel discards drafts; a failed save retains the editor and input and shows an error. Preserve section forms and all existing row-management actions.
5. Show a “Monthly total” below each section. Sum saved query values in integer cents, treating unset as zero; empty/all-unset sections total `€0.00`. Do not persist totals or include unsaved drafts. Edit, clear, and delete refresh the total.
6. Retain `GET /plan/sections` and `PLAN_SECTIONS_QUERY_KEY`. Await invalidation after saves and include row saves in the per-section pending guard through mutation and refresh, alongside add/move/delete.

### Verification and completion

- Extend the real API/database integration tests in `backend/tests/integration/api/routes/test_plan_routes.py`: unset defaults, set/replace/clear/zero, reload, omission preservation, atomic combined updates, validation, and missing rows. No service/repository mocks.
- Extend `frontend/src/clients/backendClient/planResponseParsers.test.ts` and add pure `planAmounts.test.ts` cases for parsing, input validation, serialization, exact totals (`0.10 + 0.20 = 0.30`), and section independence.
- Storage migration `892cb40c7a90` and the backend contract are implemented. All 69 Plan API tests pass, including the 23 amount cases. Ruff, formatting, and targeted backend type checks pass. The frontend boundary now validates response amounts into integer cents, parses dot/comma input, and serializes updates while preserving omitted versus null amounts. All 52 frontend contract tests now pass, including exact-cent section totals (75/75 named feature tests green). Section totals sum saved query values; row saves join the per-section pending guard through mutation and query refresh. The user confirmed the total is correct and accepted its placement below the add-row controls. Implementation, the automated checkpoint, and user acceptance are complete; the browser results and explicitly waived scenarios are recorded below.
- Storage verification (2026-11-03): migration upgrade/downgrade/re-upgrade preserved existing row identities, names, positions, and section links. Existing rows became null; ORM writes of `1034.89`, `0.00`, and the maximum amount reloaded as exact `Decimal` values, and clearing reloaded as null. Alembic found no model/schema drift. Checks used a disposable database; the local development database was upgraded to `892cb40c7a90` on 2026-11-03 and `GET /plan/sections` returned 200 with amount fields present. Downgrading drops the new amount column and its values.
- **Automated checkpoint passed (2026-11-03):** all 216 backend tests and all 59 frontend tests pass; the named feature subset is 75/75 green with no expected-red remaining. Root `make lint` (Ruff, formatting, ty, ESLint, Prettier) and the frontend production build pass. Formatting made no code changes. The existing large-bundle warning remains. The owned test database container was stopped and verified; existing development services were preserved.
- **User acceptance complete (2026-11-03):** the user confirmed the row editor, correct totals, and the total’s placement below “+ Add row.” Final check 1 passed: saved values versus drafts, Cancel, clear versus zero, and reload. Final check 2 passed: invalid amount input does not persist either the amount or an accompanying name change.
- **Explicitly waived by the user:** final checks 3–5 (slow-network overlapping actions, failed-save recovery, and narrow-screen layout). These scenarios were not browser-verified; the user chose not to require them for completion.

Out of scope for 3a: month columns/range controls, month overrides, left-over calculations, percentage defaults, category/filter links, plan-versus-actual reporting, and broad architecture refactoring.

## Step 3b — Month columns [PENDING]

1. Add `GET /plan?from=YYYY-MM&to=YYYY-MM` with validated month ranges and one grid builder in `plan_service.py`. Resolve each row/month from its fixed amount or null. Return months, ordered sections/lines, and per-month values; later overrides and waterfall calculations extend this builder.
2. Compute per-section monthly totals with `Decimal` in the backend, treating null as zero. Replace the frontend-only totals from 3a when this grid becomes the page's data source; do not maintain competing calculations.
3. Render a plain table/CSS grid with a sticky name column, section headers, rows, totals, and a month-range control. Preserve row management and fixed-amount editing; month cells remain read-only in this slice.
4. Switch the page to only the computed grid query (`PLAN_QUERY_KEY`) and invalidate it for all section/row mutations. Choose the initial month range during this later slice; range persistence is not required.

Done when recurring fixed amounts appear in every selected month, totals update, and changing the range re-fetches. Step 4 then adds per-month overrides, step 5 adds left-over rows, and step 6 introduces percentage storage and resolution.
