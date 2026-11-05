# Step 3 — Fixed amounts, then month columns

Read [conventions.md](conventions.md) first. Requires step 2 (plan lines), committed in `8f082e2`.

The original combined step is split into two reviewable feature slices. Step **3b** is now authorized one checklist item at a time through `/do-next`; the active checklist lives in the conversation.

## Step 3a — Fixed amounts and section totals [COMMITTED]

Committed and pushed in `0d5dc98` (Add fixed monthly plan amounts and section totals). This section records the delivered 3a contract and verification; 3b below supersedes its frontend total calculation and sections query.

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

## Step 3b — Month columns [COMMITTED]

The month-grid implementation is committed, including range-error draft recovery and the compact Add row control beside Monthly total. The final automated checkpoint passed on 2026-11-04; the narrow-screen defect found during browser verification was fixed on 2026-11-05. User acceptance is complete as of 2026-11-05: deletion passed; slow-request guards and failed-save recovery were explicitly skipped by the user.

### Computed grid contract

- `GET /plan?from=YYYY-MM&to=YYYY-MM` requires both bounds. The inclusive range must contain 1–120 months in ascending order. Missing bounds return 422; malformed, reversed, or oversized ranges return 400. Oversized ranges are rejected, never clamped.
- `month_schemas.py` shares `MonthKey` with report schemas and builds ranges with pandas monthly `Period` / `period_range`. Four-digit years are preserved, including `0000` and `9999`.
- `plan_service.get_plan_grid` reads ordered sections and lines through the repository once. It returns `months` and `sections`; each section includes its metadata, `lines`, and `totals` keyed by month. Each line includes its metadata, `fixed_amount`, and `amounts` keyed by month. Every map contains exactly the returned months.
- A line resolves to its saved fixed amount or null in every requested month, including past months. Totals use Python `Decimal`, treating null as zero; empty/all-unset sections total `"0.00"`. Amounts and totals serialize as two-decimal strings, with null preserved only for unset line amounts.
- There is no new migration, persisted total, or duplicated monthly copy of a recurring amount. Existing section/line write endpoints remain; `GET /plan/sections` also remains available, but the page no longer uses it.

### Frontend behavior

- The initial range is the browser's current local month plus the next five. From/To inputs hold local drafts; Apply validates and selects the inclusive range. Invalid or incomplete ranges show an error and keep the displayed grid. Reload resets to the initial range; no range preference is persisted.
- One query, keyed by `[...PLAN_QUERY_KEY, from, to]`, supplies the grid. Every section/line mutation invalidates all cached Plan ranges and awaits the active refresh. Apply is disabled during Plan fetches or mutations. The last displayed grid remains mounted during a range fetch and after a fetch error, preserving open row drafts. A failed fetch shows an inline error with Retry; success replaces the displayed range without discarding drafts.
- Zod validates consecutive months and complete amount/total maps, then the parser converts decimal strings to integer cents (`fixedAmountCents`, `amountsCents`, `totalsCents`). Totals must fit safe integer cents. The superseded frontend total calculation and sections-list query/parser are removed.
- A plain CSS grid/subgrid renders month headers, ordered sections, rows, and per-month totals. At grid-container widths of at least `36rem`, horizontal scrolling keeps the name/actions column sticky. Narrower grids scroll the entire row so the name column cannot hide the months. Tailwind handles styling except the runtime `gridTemplateColumns` value derived from the month count.
- Month cells remain read-only and show saved values even while a row is being edited. Unset displays `—`; explicit zero displays `€0.00`. Editing the recurring amount changes the row default and therefore every month. Section/row creation, rename, ordering, deletion, local drafts, and mutation errors remain in place.

### Verification so far

- **Named feature tests: 68/68 green, no expected red:** 26 real API/database integration cases, 27 new frontend grid-boundary cases, and 15 month-range cases. The frontend focused run also includes 19 existing parser regressions (61 frontend tests total). Coverage includes range boundaries, ordering, exact totals, null/zero, saved mutations and reload, response validation, and safe integer cents. No service/repository mocks.
- **Automated checkpoint passed (2026-11-04):** all 242 backend tests and 97 frontend tests pass, including all 68 named feature tests. Root `make lint` (Ruff, formatting, ty, ESLint, Prettier) and the frontend production build (`tsc -b` + Vite) pass. Formatting made no changes; the existing bundle-size warning remains. Integration tests used a disposable database, verified removed afterward. No test containers were started; existing development services were preserved.
- **Browser checks completed with explicit user authorization:** six month headers, recurring values and totals, unset/zero/clear, saved amount reload, Cancel, horizontal scrolling with sticky names, applying one- and two-month ranges, invalid/reversed/oversized range errors, open row draft preservation across a successful range change, and default range reset on reload.
- Temporary browser-check records were removed through the API after the browser's native delete confirmation could not be exercised. Deletion was subsequently verified by the user; the final outcomes below record separate, explicit 3b decisions.
- **Final browser check, 2026-11-04 — narrow-screen failure:** at a 390×844 viewport, collapse the sidebar and scroll the Plan grid horizontally. The grid viewport is 242px wide, but the sticky name/actions column has a `20rem` minimum. Scrolling moves month cells underneath that column, so month amounts remain hidden; some actions are clipped too. The failure persists with the sidebar collapsed and is therefore not solely an app-shell issue. No console warnings/errors were captured. The viewport and sidebar were restored; no Plan records were changed.
- **Narrow-screen fix verified (2026-11-05):** a named Tailwind container query enables sticky positioning only at `36rem` and above, consistently for headers, row names/editors, add-row forms, and total labels. At 390×844 with the sidebar collapsed, horizontal scrolling now reveals the last month and totals; row Edit, amount input, Save focus, and Cancel remain reachable. At the default desktop viewport, names remain sticky while months scroll. No Plan records changed; viewport/sidebar restored. Frontend tests, touched-file lint/format checks, and the type/build check passed; backend results from the automated checkpoint are reused because this change only affects CSS classes.
- **Management checks passed (2026-11-05):** created two temporary sections, reordered them, renamed one, created two rows, reordered the rows, and renamed/set a row to €1.23. Reload preserved section/row names and order, all six amounts, and section totals. Cleanup removed exactly those two sections and their rows through the API; the full sections response matched the pre-check baseline afterward, and the browser showed the original Plan again.
- **Tool limitations:** row Delete timed out at the native confirmation, and the Browser dialog API exposed no dialog; the row remained. Browser capabilities provide no network throttling or request blocking, so slow-request and failed-save checks could not be completed safely through those tools. The user subsequently resolved these checks as recorded below.
- **User acceptance complete (2026-11-05):** all required checks are resolved. Prior automated results are reused for this documentation-only update; no product source, tests, dependencies, or configuration changed.

### QA follow-up verification

- **Range-load error recovery (2026-11-05):** QA found that an unsuccessful range fetch unmounted row editors and lost unsaved drafts. The page now retains the last displayed grid and offers inline Retry. An isolated local preview returned HTTP 503 for the range read: both unsaved name/amount fields survived the error and successful Retry, while saved cells stayed unchanged until the new range loaded. The draft was canceled without saving; the owned preview process was stopped. No development service was restarted. This verifies range-load recovery, not the separately skipped failed-save scenario.

### Final browser outcomes

1. **Slow-request guards — explicitly skipped by the user.** Not browser-verified; do not count as passed or reopen automatically.
2. **Failed-save recovery — explicitly skipped by the user.** Not browser-verified; do not count as passed or reopen automatically.
3. **Deletion confirmation — user-verified passed.** The user confirmed the requested row cancel/confirm, total update, section deletion, and reload scenario works.

Done when recurring fixed amounts appear in every selected month, totals update, and changing the range re-fetches. Step 4 then adds per-month overrides, step 5 adds left-over rows, and step 6 introduces percentage storage and resolution.
