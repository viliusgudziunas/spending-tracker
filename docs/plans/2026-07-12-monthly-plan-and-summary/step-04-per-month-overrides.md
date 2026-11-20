# Step 4 — Per-month overrides [COMMITTED]

Read [conventions.md](conventions.md) first. Requires step 3b (month grid); step 3a alone is insufficient.

## Goal

Make individual cells editable. A cell edit creates a **per-month override** that beats the line's default for that month only (e.g. Groceries defaults to 700 but December is set to 800). Lines without a default get their values entered this way too. Overridden cells are visually distinct and can be reverted to the default.

## Backend

1. New model `PlanValue` in `backend/app/db/models.py`:
   - `id` (UUID pk), `line_id` (UUID FK → `plan_line.id`, `ondelete="CASCADE"`, not null), `month` (str `YYYY-MM`, not null), `amount` (`NUMERIC(12,2)`, not null; Python `Decimal` and decimal-string JSON per conventions).
   - Unique constraint on `(line_id, month)`.
   - Only overrides/manual entries are stored in `plan_value`; recurring values are resolved from the saved row default rather than copied into each month.
2. Migration `71b239c9f2d8` follows `892cb40c7a90`; no backfill or copied defaults. Downgrade removes only override storage and values.
3. Endpoints (validate the `{month}` path param with the shared month helper — never persist a malformed month key):
   - `PUT /plan/lines/{line_id}/values/{month}` — required body `{ amount: decimal string }`; upsert the override. Amounts must be non-negative, at most 10 whole digits and 2 decimal places; zero is valid. Repeated PUT replaces the same line/month value.
   - `DELETE /plan/lines/{line_id}/values/{month}` — remove the override (cell falls back to the current default, or blank). Repeated DELETE succeeds for an existing line.
   - Both return empty 204 responses; missing lines return 404, and invalid month/amount inputs return 422.
4. `GET /plan` resolves override if present, else default, else null. Every requested month has a cell: `amounts[month] = { amount: decimal string | null, is_override: bool }`. Presence determines the flag, including zero and equal-default overrides. `fixed_amount` remains the recurring default; section totals sum resolved amounts with `Decimal`.

## Frontend

1. Cells become clickable: click → inline text input with decimal keyboard (reusing the existing money parser) → save on Enter/blur (PUT), Escape cancels. Empty input on an overridden cell = revert (DELETE); empty input on a non-overridden cell just cancels (no API call). An explicit `0` requires typing 0 and saving.
2. On PUT/DELETE failure, keep the editor open and show the API error (don't invalidate the grid, so the user's input isn't lost).
3. Overridden cells show a subtle blue tint and a small corner dot. Amounts stay on one line; a compact reset icon appears on hover or keyboard focus and stays visible on touch devices. It remains outside the editor; failed reverts retain the override with an inline error.
4. Await Plan-prefix invalidation only after successful writes; section pending guards cover the refresh. Failed writes retain drafts without invalidation. Successful writes with failed refreshes use the grid Retry flow rather than resending.
5. Untouched edits cancel; deliberately entering the same amount as the default creates an override. Enter/blur submissions are deduplicated; Escape suppresses blur saving. Frontend cells parse to `{ amountCents, isOverride }`, with strict boolean flags, non-null override amounts, and exact month coverage.

## Done when

You can set December Groceries to 800 while other months stay 700; the cell is visibly marked as overridden; reverting restores 700; values persist across reloads.

## Out of scope

Left-over rows (step 5), percent defaults (step 6), and category/filter links.

## Current closeout — 2026-11-20

Implementation is complete and committed with the feature closeout. The user accepted monthly editing and formatted input, and explicitly skipped the remaining manual acceptance scenarios. Range persistence is implemented and automatically verified; its one normal-use reload check remains after shipping. Deployment is not claimed.

Progress: **4 / 5 done** in the final closeout checklist; mode: nameable behavior.

- [x] 1. Write the range-persistence tests.
- [x] 2. Remember the applied months.
- [x] 3. Verify the fix automatically.
- [x] 4. Close the current plan and prepare the rework handoff.
- [ ] 5. Confirm range persistence during normal use — after ship, user-owned.

### Final behavior and verification

- Monthly values, explicit zero, unset rows, current-default reversion, section totals, and saved amount persistence are implemented. The API/storage contract above is unchanged.
- The shared input parser accepts common pasted euro formats in both monthly cells and recurring defaults, including Unicode spaces. Ambiguous lone punctuation with three trailing digits is rejected; API serialization remains exact two-decimal strings.
- Apply saves the validated range to `localStorage` under `app:plan:month-range`. Initial rendering restores both controls and grid from it. Invalid/missing storage falls back to the current local month plus five; unavailable storage does not prevent using the grid. Unapplied drafts are not persisted. No database month entity is created by this display preference.
- Latest frontend checkpoint: **194 / 194 passed**, including **18 / 18 new persistence tests**, **33 / 33 total range tests**, and **91 / 91 amount tests**. ESLint, Prettier, TypeScript, and production build passed. Existing Zod annotation and bundle-size warnings remain non-blocking.
- Backend QA verification: **286 / 286 passed**, including 42 monthly-value integration cases. QA added six API cases rejecting non-ASCII month years in ranges and PUT/DELETE, fixing keys that could be saved but not read by the grid. With 17 frontend override-parser cases, all 59 current override tests pass; the original 55 remain covered. The prior isolated PostgreSQL container was stopped and verified; no services were started for the frontend checkpoint.
- User-verified behavior includes formatted monthly entry, month isolation, explicit zero/no-default entry, saved values after reload, default/revert final state, reverting to blank, invalid drafts and cancellation, recurring-default final amounts/totals, click-away save, and clearing an entry.
- Remaining manual acceptance scenarios are **explicitly skipped**, not passed: network failures/retries, failed refresh, request counting/throttling, keyboard/narrow-window checks, and unconfirmed intermediate/format cases. Do not reopen the accepted walkthrough. The disposable Amount QA section was not confirmed deleted; cleanup is not an acceptance gate.

### After-ship follow-up

During the first normal local session using the range fix, the user applies a range and reloads `/plan`; the controls and grid must retain the same months. Baseline: the user observed reset before this fix. Post-fix browser evidence is still unverified; deadline is that first session, not a monitoring campaign. A mismatch becomes a focused follow-up issue. No flags, dashboards, telemetry infrastructure, or extended browser walkthrough is required. Shipping and this check remain separate from the completed automated checkpoint.

## Month-locking rework handoff

This is preparation for a separately reviewed plan, not authorization to implement a new model. Keep the current working code and all entered data.

**Required outcome:** monthly edits are ordinary planning values; defaults provide a starting/fallback value, and explicitly locking a finished month must prevent later default changes from rewriting it.

**Current limitations:** there is no plan-month entity, lifecycle, or snapshot. `plan_value` stores only explicit line/month entries, including zero. Other amounts are computed from today's defaults; deleting a line/section cascades to its values. Current display preferences do not protect historical plans.

**Reuse:** month grid, inline editors, exact-cent input/serialization, range validation/persistence, mutation/error handling, backend decimal totals, and real API/PostgreSQL regression coverage. Adapt the current cell metadata and storage when the new contract is settled; do not discard these pieces pre-emptively.

**Decisions to settle before the next implementation plan:**

1. Do default changes update untouched/default-backed cells in unlocked months, or seed only newly started months? Updating unlocked default-backed cells is the recommendation, not an agreed decision.
2. When is a month created, and what exactly does locking preserve? The proposed snapshot includes resolved amounts (zero and blank included) plus the row/section names, order, and membership needed to preserve the historical plan and totals.
3. How do explicit reopening and subsequent template edits behave? Recommended: reopening retains saved amounts until deliberately edited; define how row/section deletion, additions, renames, and ordering interact with saved months.
4. How are existing entries migrated into the new month lifecycle? Preserve every saved line/month amount and recurring default; do not silently mark old months locked. Historic inherited amounts cannot be reconstructed if their earlier defaults were never stored.

The next plan should specify the chosen schema/migration, transactional locking, API/response contracts, UI behavior, and regression coverage for default changes, lock/reopen, and row/section edits. Consider the repository's existing report snapshot pattern without committing to JSON versus relational snapshots prematurely. Back up existing data before a future migration; no migration or data rewrite is part of this closeout. Left-over rows, percentage defaults, and category/filter links remain outside this increment. Resolve month lifecycle/history semantics before advancing those roadmap items.

## Historical implementation and acceptance record

The dated checkpoints below describe progress at the time. Their pending/next-item wording is superseded by the current closeout and explicit user skips above; retain them as evidence, not the active checklist.

### Initial test checkpoint — 2026-11-19

- `TestPlanMonthValues` in `backend/tests/integration/api/routes/test_plan_routes.py`: **38 expected red** cases covering replacement/repeated PUT, default and other-month isolation, zero and manual values, current-default/null reversion, repeated DELETE, invalid input, missing lines, parent cascades, reload, and exact section totals. The real FastAPI/service/repository/PostgreSQL stack runs without mocks.
- `plan override response parsing` in `frontend/src/clients/backendClient/planResponseParsers.test.ts`: **17 expected red** cases for the cell response, integer cents, zero/unset/equal-default overrides, strict flags, null-override rejection, money validation, and complete month coverage. Each rejection case first accepts a valid grid so rejecting all cell objects cannot falsely pass it.
- Named feature tests: **0 / 55 green (55 expected red)**. Backend failures assert the missing endpoint's status/detail; frontend failures assert acceptance of the new cell shape. No import, collection, or setup errors occurred.
- Existing tests were preserved: **95 backend + 46 frontend green** in the two affected test files. Adapt existing grid fixtures to the approved contract in checklist item 5, without dropping assertions.
- The tests pin PUT/DELETE success to 204, missing lines to 404, invalid inputs to 422, and grid cells to `amounts[month] = { amount, is_override }`. Parsed cells use `{ amountCents, isOverride }`; `fixed_amount` and section totals retain their existing meanings.
- Touched-file Ruff, formatting, backend type checks, ESLint, Prettier, and frontend TypeScript checks passed. Frontend dependencies were installed from the existing lockfile.
- Tests used an isolated PostgreSQL container; the disposable fixture database was removed and the owned container was stopped and verified. Existing development services were preserved.
- Browser interaction and failure-recovery checks remain pending checklist item 10; no browser checks or development service startup were performed.

### Storage checkpoint — 2026-11-19

- Added `PlanValue` and migration `71b239c9f2d8` after `892cb40c7a90`: UUID id, required line foreign key with database cascade deletion, required month, non-null `NUMERIC(12,2)` amount, and unique `(line_id, month)`. The unique constraint supplies the line lookup index; no duplicate index, ORM collection, or backfill was added.
- On an isolated database, upgrade/downgrade/re-upgrade preserved existing section/line identities, names, positions, relationships, and defaults (`700.00`, null, and zero). New storage started empty; downgrade removed only the override table and its values.
- Verified ORM writes and fresh-session reloads of `0.00`, `0.20`, and `9999999999.99` as exact `Decimal` values; duplicate line/month, nonexistent parent, and null amount were rejected. Deleting a line and then its section removed their overrides without touching unrelated values. Alembic reported no model/schema drift before downgrade or after re-upgrade.
- Re-ran both affected test files: **95 backend + 46 frontend existing tests green; 0 / 55 feature tests green (55 expected red)**, with no setup/import errors. The endpoints and cell-response implementation remain pending; no tests were weakened or skipped.
- Touched Python files pass Ruff, formatting, and type checks. Disposable databases were removed, and the owned test container was stopped and verified; the development database was not migrated and existing services were preserved.

### Save/revert endpoint checkpoint — 2026-11-19

- PUT/DELETE `/plan/lines/{line_id}/values/{month}` now return 204 on success. The required PUT amount reuses fixed-amount decimal-string validation; the month uses shared `MonthKey` validation. Invalid input returns 422, while a missing line returns 404 with `Plan line not found`.
- Services check the parent line before writing. The repository uses PostgreSQL `ON CONFLICT` to replace only the selected line/month amount, and DELETE is idempotent for an existing line. Both writes retain the existing commit/rollback behavior.
- Strengthened the existing lifecycle test with a direct stored-amount assertion after replacement/repeated PUT, including zero and the maximum amount. No existing assertion was removed or weakened.
- Both affected test files were re-run: **27 / 55 named feature tests green (28 expected red)**. The 27 green cases cover invalid values/months and missing lines; successful save, repeated save, stored amount, uniqueness, repeated delete, and deletion read-back assertions pass before 11 backend cases reach pending grid-response/total assertions. The 17 frontend cell-parser cases also remain expected red. All **95 backend + 46 frontend existing tests** pass, with no setup/import errors.
- Touched-file Ruff, formatting, and type checks passed. The isolated fixture database was removed and the owned test container was stopped and verified. No development migration, service startup, or browser checks were performed.

### Monthly resolution checkpoint — 2026-11-19

- Split the original response-contract item before implementation to keep each pass reviewable: item 4 resolves monthly amounts/totals while preserving the current response shape; item 5 adds cell metadata and updates backend fixtures, frontend parsing, and display together. The approved final cell contract is unchanged. Later items are now 6 mutations, 7 inline editing, 8 markers/reversion, 9 automated verification/documentation, 10 user browser checks, and 11 first local session after shipping.
- The grid fetches saved overrides for the requested months in one query and resolves each cell by line/month presence, preserving explicit zero. It falls back to the current recurring default or null and computes each month's section total from resolved values using `Decimal`. No monthly copies or totals are stored.
- Corrected the new section-cascade test's expected position: deleting the first section renumbers the remaining section from 2 to 1 under existing behavior. The full-section equality assertion remains intact; no assertions were removed or weakened.
- Both affected test files were run: **29 / 55 named feature tests green (26 expected red)**. Both cascade cases now pass, including resolved totals and unrelated-value preservation. Nine backend cases reach the pending cell-object assertion with correct primitive values; 17 frontend cases still await the new contract. All **95 backend + 46 frontend existing tests** pass. No unexpected failures or setup/import errors remain.
- Touched-file Ruff, formatting, type checks, and self-check passed. Disposable databases were removed; both owned test containers were stopped and verified. No development migration, service startup, or browser checks were performed.

### Cell contract checkpoint — 2026-11-19

- Grid cells now return `{ amount, is_override }`; `amount` is a two-decimal string or null. Override presence determines the flag even for zero or an amount equal to the recurring default. Fixed defaults and section-total contracts are unchanged.
- The frontend validates boolean flags, rejects null overrides, preserves exact month-map coverage, and parses cells into `{ amountCents, isOverride }`. The read-only grid consumes the new shape; editing and visible override markers remain later items.
- Adapted existing backend and parser fixtures to the approved cell contract without dropping or weakening assertions. Malformed-money and month-coverage fixtures still exercise their intended validation, using otherwise-valid cell objects.
- Both affected test files pass: **55 / 55 named feature tests green (0 expected red)**, plus **95 backend + 46 frontend existing tests green**. API coverage now reaches default changes, repeated save/revert, zero/manual amounts, reload, override flags, cascades, and exact totals. No tests were skipped.
- Touched-file Ruff, formatting, backend type checks, ESLint, Prettier, frontend TypeScript, and self-check passed. The disposable database was removed and the owned PostgreSQL test container was stopped and verified. Browser checks remain pending item 10; no development migration or service startup was performed.

### Monthly mutation checkpoint — 2026-11-19

- Added client PUT/DELETE methods for a line/month and a required `amountCents` save payload. PUT reuses `serializePlanAmount`, including explicit zero; both methods accept empty 204 responses and reuse API/network error parsing.
- Added section-scoped save/revert hooks under the existing row-update mutation key. Existing section and page pending guards cover writes and the awaited Plan-prefix refresh. Invalidation happens only on successful writes; failed requests propagate errors without invalidation or optimistic cache changes. The editor will call these hooks in item 7.
- Verification: **55 / 55 named feature tests green (0 expected red)**, **95 backend + 46 frontend existing tests green**, and **29 money utility tests green**. Touched-file ESLint, Prettier, TypeScript, and self-check passed. No tests were changed; hook interaction and draft/error behavior remain part of the pending editor/browser checks.
- The disposable database was removed and the owned PostgreSQL test container was stopped and verified. No development migration, service startup, or browser checks were performed.

### Inline editing checkpoint — 2026-11-19

- Month cells now open a separate editor with a local draft. Enter/blur saves through the existing mutation hooks; Escape suppresses saving and closes. An untouched input cancels; deliberately typing the recurring default creates an explicit override. Blank inherited cells cancel, blank overrides use DELETE, and typed zero uses PUT. Row-default editing disables month edits.
- Pending writes use a synchronous guard and read-only input; duplicate blur attempts for the same draft are suppressed. A failed PUT/DELETE keeps the editor/draft and an inline error; Enter retries, or changing the draft permits a new blur attempt. Success closes after the awaited refresh. A successful write with a failed refresh uses the existing grid Retry flow rather than resending the write.
- Verification: **55 / 55 named feature tests green (0 expected red)**, **95 backend + 46 frontend existing tests green**, and **29 money utility tests green**. ESLint, Prettier, TypeScript, and touched-file self-check passed. No existing tests changed. Editor event ordering, failure recovery, focus, and layout still await the consolidated user browser check in item 10; these interactions were not automatically exercised.
- The disposable database was removed and the owned PostgreSQL test container was stopped and verified. No development migration, service startup, or browser checks were performed.

### Override marker/revert checkpoint — 2026-11-19

- Saved overrides now show a blue tint and an Override label, determined by `isOverride` rather than comparing amounts. Zero and equal-default overrides are marked too.
- Added a keyboard-accessible Revert button in the display tree, outside the editor to avoid blur/save conflicts. It uses the existing DELETE hook, synchronous duplicate protection, and pending guards. The backend resolves the current default or null and recomputes totals after refresh.
- Failed reverts retain the override and display the API error, allowing retry. A successful DELETE with a failed refresh disables further writes from that display and points to grid Retry. Refreshed inherited metadata remounts the display to clear completed mutation state.
- Verification: **55 / 55 named feature tests green (0 expected red)**, **95 backend + 46 frontend existing tests green**, and **29 money utility tests green**. ESLint, Prettier, TypeScript, and self-check passed. No tests changed. Marker appearance, keyboard use, revert failure/retry, and editor interaction remain pending the user browser check in item 10.
- The disposable database was removed and the owned PostgreSQL test container was stopped and verified. No development migration, service startup, or browser checks were performed.

### Automated verification checkpoint — 2026-11-19

- Full backend suite: **280 passed**, running real API/repository/PostgreSQL integration tests on an isolated PostgreSQL 16.4 container. The fixture migrated its disposable database to head and removed it afterward; the owned container was stopped and verified. Existing development services and the development database were untouched.
- Full frontend suite: **114 passed**. Named feature tests: **55 / 55 green (0 expected red)** — 38 API cases and 17 response-parser cases. No required automated tests were skipped or remain unwritten.
- Root `make lint` passed (Ruff, formatting, backend type checks, ESLint with zero warnings, and Prettier); formatters changed no files. `npm run build` passed, including TypeScript. Vite reported non-blocking Zod annotation warnings and a bundle-size warning (main JavaScript bundle about 1.73 MB before gzip).
- Migration downgrade/re-upgrade, existing-data preservation, constraints, cascades, and schema-drift evidence remain recorded in the storage checkpoint; migration/model code has not changed since those checks. This full-suite run also exercised a fresh migration to head.
- Updated the spec and main plan to match the implemented contract and current scope. No implementation or tests changed in this checkpoint. Self-check: skipped (no code changes).
- **Browser acceptance remains pending item 10.** Automated tests cover the API, parser, and money calculations, not React event ordering, keyboard/focus, visual layout, pending guards, or failure/retry interactions. The user will receive one consolidated checklist with complete startup/migration commands at that checkpoint. Step 3b's earlier browser skips do not waive these override-feature checks.
- **After shipping (item 11):** verify a saved override and section totals in the first real local session, including reload and reversion. Deployment and that session are not yet verified. Step 4 remains `[IN PROGRESS]` until user browser acceptance; the automated checkpoint alone does not claim overall verification.

### User browser check — awaiting your browser check

Item 11 is handed off, not completed; resume after the new amount-format step. Run the setup yourself; Codex has not started services, migrated the development database, or opened a browser. After you confirm startup, Codex can check API readiness without driving the browser. Prerequisites: Docker Desktop/Compose running, Python 3.14 and Poetry (already used for automated checks). This checkout uses ports 5432, 8001, and 5174; no extra worker, account, or feature flag is required.

Terminal 1 — start the full stack and leave it running (reuse an existing watch terminal for this checkout if already current):

```bash
cd /Users/viliusgudziunas/Home/spending-tracker
docker compose up --build --watch
```

Terminal 2 — once PostgreSQL is ready, install host migration tooling and apply the migration to the local app database:

```bash
cd /Users/viliusgudziunas/Home/spending-tracker
docker compose exec -T postgres pg_isready -U postgres -d spending-tracker
cd /Users/viliusgudziunas/Home/spending-tracker/backend
poetry install
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/spending-tracker ORIGIN_URL=http://localhost:5174 poetry run alembic upgrade head
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/spending-tracker ORIGIN_URL=http://localhost:5174 poetry run alembic current
```

Expected revision: `71b239c9f2d8 (head)`. Alembic runs on the host because the backend image omits development dependencies. If PostgreSQL is not ready or any setup command fails, stop and report the output before testing.

Open <http://localhost:5174/plan>. Set From **2026-12**, To **2027-01**. Create a disposable section **Override QA** with rows **Groceries** (recurring default 700), **Manual** (no default), and **Cents** (default 0.10). Initial section totals should be 700.10 in both months. Use DevTools Network to count PUT/DELETE requests; leave unrelated Plan data alone. Perform the checks in order:

1. **Single-month and equal-default overrides.** Set December Groceries to 800 with Enter, then click outside. Expect one PUT, an Override marker, December total 800.10, January total 700.10, and recurring default still 700. In January, select all and deliberately type 700; expect an Override marker even though it equals the default.
2. **Manual amounts, zero, blur, reload.** Save December Manual as 0 (marked zero), then 0.20 by clicking outside. Save December Groceries as 0. Expect December total 0.30, January total 700.10, and both December entries marked. Reload and reselect the range if needed; values, markers, and totals must persist.
3. **Current-default and blank reversion.** Change Groceries' recurring default to 900; December remains 0 and January remains 700. Revert January with its button; clear December Groceries' editor and save. Both become inherited 900, with totals 900.30/900.10. Revert December Manual; it becomes blank and both totals become 900.10. Set the Groceries default to 0, enter a temporary override, then Revert: inherited zero is restored and both totals are 0.10.
4. **Cancel and validation.** Opening an inherited cell and leaving it untouched must send no write. Clearing that inherited cell must cancel without DELETE. Type a changed value then Escape: no write, original value retained. Negative and more-than-two-decimal input must retain the draft with an error and send no write; Escape must still cancel.
5. **Failed writes preserve drafts/errors.** In DevTools request blocking, block the selected `/plan/lines/.../values/...` URL. Attempt December Groceries = 800: editor and draft remain, an error appears, totals stay unchanged, and no successful grid refresh occurs. Unblock and press Enter to retry; expect 800. Block again and use Revert: override remains with an error. Also try clearing its editor while blocked: the blank draft/error remain. Unblock and press Enter; expect inherited zero and total 0.10. Remove request blocking afterward.
6. **Successful write, failed refresh.** Block only the GET `/plan?...` URL, leaving `/plan/lines/.../values/...` writes allowed. Save December Groceries = 123: PUT succeeds (204), grid shows a refresh error with Retry. Unblock GET and click Retry: expect 123 and total 123.10 without another PUT. Repeat with Revert while GET is blocked: DELETE succeeds, stale display directs you to Retry; unblock and Retry restores zero without another DELETE.
7. **Slow request guards.** Use Network throttling, edit December Groceries, press Enter and immediately click outside. Expect one PUT; during write/refresh, cell editing, row actions in the section, and month-range Apply are unavailable. Restore normal networking and revert the temporary override.
8. **Keyboard/layout and cleanup.** At a narrow viewport, horizontally scroll to both month columns; inputs, amounts, markers, errors, and Revert remain usable without overlapping. Use Tab/Enter to edit and activate Revert, and Escape to cancel. Delete only the disposable Override QA section when finished; reload and confirm it is gone and unrelated sections are intact.

Reply with setup confirmation and pass/fail by check number, describing any mismatch. Screenshots or Network details are useful only for a failed case. Step 3b's earlier slow-request/failed-save skips do not apply to these checks. Item 12 (the first real local session after shipping) remains pending separately.

### Implementation item 10 — Parse common pasted euro amounts [IMPLEMENTED]

**Goal:** accept common spreadsheet/bank amount formats in both month-cell edits and recurring-default edits. Reuse the shared `parsePlanAmountInput` in `frontend/src/shared/utils/planAmounts.ts`; both editors already call it. Keep this as one focused `$do-next` pass: regression cases, parser change, error wording, and relevant verification together. No new package, API change, migration, or currency conversion.

Accepted examples:

| Input | Parsed cents |
| --- | ---: |
| `7157`, `7 157` | 715700 |
| `7157.02`, `7157,02` | 715702 |
| `7 157,02 €`, `7 157.02` | 715702 |
| `7.157,02`, `7,157.02` | 715702 |
| `€7,157.02`, `EUR 7 157,02`, `7 157,02 eur` | 715702 |
| `0`, `0,00 €`, `€0.00` | 0 |
| Empty or whitespace only | null |

- Normalize regular, non-breaking (`U+00A0`), and narrow non-breaking (`U+202F`) spaces used around the amount or as grouping separators. Allow one optional `€` or case-insensitive `EUR` token at either edge. Validate grouping rather than stripping arbitrary characters: groups after the first must have exactly three digits, with one consistent grouping style.
- A lone dot/comma followed by one or two digits is the decimal separator. When both occur, the rightmost is decimal and the other must form valid thousands groups. Space-grouped whole numbers are accepted. Preserve exact integer-cent conversion, explicit zero, empty-to-null behavior, the existing maximum, and the two-decimal limit; never round invalid input.
- **Ambiguity decision, proposed default:** reject a lone dot/comma with three trailing digits (`1.234`, `1,234`, `7,157`) rather than guessing whether it means thousands or excess decimal precision. This preserves the current rejection of `1.001` and `1.230`. Whole thousands can be pasted with spaces or without separators. If the user wants lone punctuation grouping accepted, settle that policy before implementation.
- Reject malformed/mixed grouping, repeated currency markers, currency-only input, negative/accounting values, non-finite values, exponent notation, trailing text, non-euro currency symbols, excessive precision, and values above `9999999999.99`. Show an error with accepted examples rather than only digit limits. The backend still receives canonical two-decimal strings and retains strict validation.
- Extend the existing pure-function `planAmounts.test.ts`: parameterized accepted formats (including the screenshot and both Unicode spaces), one/two fractional digits, zero/blank, grouped maximum and overflow, malformed groups, currency placement, and ambiguous separators. Move the four currently rejected formats `1,034.89`, `1.034,89`, `1 034,89`, and `€700` into explicit success cases under this expanded contract. Retain other rejection and serialization assertions; add round-trip assertions for representative pasted values.
- Run the amount/parser tests, frontend lint/format/types, and production build; update this record with actual results. Existing 55 override tests remain required. Completed 2026-11-20: all 91 amount tests, 176 frontend tests, and 280 backend tests passed; lint, formatting, types, and production build passed. Browser acceptance remains pending.
- Add to browser item 11: paste `7 157,02 €`, `7.157,02`, and `€7,157.02` into a disposable month cell and recurring default. Each must save as €7,157.02 with correct section totals and persist after reload. Check explicit zero, malformed/ambiguous input retaining its draft/error, and blank cell reversion. Continue the remaining override checks one at a time with the user.

The range-persistence follow-up below supersedes this remaining order; amount parsing is now implemented. The screenshot confirms the Plan input is reachable and the formatted amount is rejected; it does not establish that the remaining save/revert checks passed.

### Browser feedback — cleaner override cells

Implemented the user-approved visual revision: removed the visible Override/Revert text row, softened the tint, added a small corner dot with accessible override text, and placed a compact reset icon beside the amount. The reset control appears on hover/focus for mouse users and stays visible on touch devices; its tooltip and accessible name explain reversion. Amounts remain right-aligned on one line and reset space is reserved to avoid movement on hover. Save/revert logic and error handling are unchanged. Visual acceptance remains with the user. Broader amount-format parsing is now implemented; range persistence below is the next fix.


### Follow-up — Preserve the applied month range after reload [IMPLEMENTED]

The user reported range reset on reload during acceptance. The fix now persists only the valid applied From/To selection in browser local storage, restores the controls and grid together, and retains the existing fallback and 120-month limit. The 18 new persistence tests and automated frontend checkpoint passed. The current closeout above replaces this follow-up's earlier implementation/browser checklist; only the agreed normal-use reload check remains after shipping.

### User browser result — 2026-11-20

**Guided check 1: passed except for month-range persistence.** The user confirmed that pasting `7 157,02 €` into December 2026 Groceries saved €7,157.02 with the override indicator; January and the recurring default remained €700.00. Section totals were €7,157.12 and €700.10, and saved values survived reload after reselecting the range. The range-reset issue remains the next implementation fix above.

This confirms only guided check 1 in the disposable **Amount QA** section (Groceries default 700, Manual without a default, Cents default 0.10). The remaining zero, additional formats/default editing, revert, failure/retry, and keyboard/layout scenarios are still pending. Do not repeat the passed amount-persistence check unless a later change invalidates it; recheck range persistence after its fix.


**Guided check 2: passed, including reload.** The screenshot showed December Groceries and Manual saved as €0.00 with override indicators, Cents at €0.10, and section totals of €0.10 for December and €700.10 for January. The user explicitly confirmed the screenshot was taken after reloading and reselecting the months. Explicit zero, entry on a row without a default, and their reload persistence are user-verified. Reversion, additional formats/default editing, failures/retries, and keyboard/layout remain pending; range persistence remains the next implementation fix.


**Guided check 3: final reverted state verified after reload.** The user supplied a screenshot explicitly taken after reload: Groceries is €900.00 in both columns without override indicators, December Manual remains an explicit €0.00 override, Cents is €0.10 in both columns, and both section totals are €900.10. This confirms the final default/reversion result and persistence. The intermediate state immediately after changing the default (December override still zero, January inherited 900) was not separately reported. Reverting a row without a default is the next guided browser check; remaining acceptance and the range-persistence fix stay pending.


**Guided check 4: passed, including reload.** The user supplied a screenshot explicitly taken after reload showing Manual blank in both columns without override indicators, Groceries at €900.00 and Cents at €0.10 in both columns, and both totals at €900.10. Reversion without a recurring default and its reload persistence are user-verified. Validation/cancellation is the next guided check; failed-write recovery, remaining format/default cases, keyboard/layout, and range persistence remain pending.


**Guided check 5: passed.** The user's three screenshots show `-1` and `1.001` retained in the December Groceries editor with validation errors and unchanged €900.10 totals in both months, followed by the cancelled editor restoring inherited €900.00 without an override marker. No request-count claim is made from these screenshots. Failed-save draft retention and retry are the next guided check; remaining acceptance and range persistence stay pending.


### Browser acceptance update — network checks skipped; recurring default result verified

The user explicitly declined network-related browser tests for this locally run app. Failed PUT/DELETE recovery, successful-write/failed-refresh recovery, request counting, and throttling/pending-request guard checks are **explicitly skipped**, not passed. This supersedes earlier instructions requiring these browser checks; do not reopen them or let them block acceptance. Existing automated tests remain unchanged; no equivalent frontend failure-path coverage is claimed.

For the next guided recurring-default check (`7.157,02`, then `€7,157.02`), the user supplied a screenshot showing Groceries at €7,157.02 in both months, Manual blank, Cents at €0.10, and both section totals at €7,157.12. The final visible result is user-verified; the screenshot alone does not separately establish which input formats were entered or reload persistence for this default change.

Next guided check: enter December Manual as `0.20` and click outside to save; expect December total €7,157.32 and January €7,157.12. Clear that monthly entry and press Enter; expect a dash without an override indicator and both totals €7,157.12. Remaining non-network keyboard/layout and range-persistence checks stay pending.


**Guided click-away save and blank reversion: passed.** The user confirmed December Manual saved `0.20` by clicking outside, yielding December total €7,157.32 while January stayed €7,157.12. Clearing the entry and pressing Enter restored a dash without an override indicator and both totals to €7,157.12. Keyboard/narrow-window usability and cleanup remain pending, along with the month-range persistence fix and its reload check. Network checks remain explicitly skipped.


### User acceptance — current feature accepted; remaining manual checks skipped

The user ended the walkthrough with “enough tests, this feature works.” The current monthly-editing and formatted-input feature is **user-accepted**. All remaining manual acceptance scenarios, including the keyboard/narrow-window check just handed off and any unconfirmed intermediate cases, are **explicitly skipped**, not passed. Previously confirmed passes remain valid; do not request further checks for this increment unless the user asks. Network-related checks remain explicitly skipped as already recorded.

The disposable Amount QA section has not been confirmed deleted; cleanup was not performed or verified. This does not block acceptance. No additional browser work is required to close this current-feature acceptance item. The known applied-month-range reset remains a separate pending fix and the next implementation work, beginning with its failing regression tests. Its future verification and the separate after-ship check have not been performed; neither is a reason to reopen the completed walkthrough. Month-locking rework preparation remains after the range fix. No commit or deployment is implied by acceptance.
