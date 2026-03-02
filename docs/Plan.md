# Project Plan (Short Version)

## Purpose
This plan tracks what the Finance web app should do, what is already done, and what is next.

## Product Snapshot
- Platform: React frontend + PHP API + MySQL
- Core modules: Records, Property Records, Water Bills, Electricity Bills, WiFi Bills, Association Bills
- Export: merged CSV by `DD + Property` with fallback to `DD`

## Completed Milestones
- [x] Migrated from legacy PHP UI to React app shell and routing.
- [x] Implemented session-based auth flow (`login`, `session`, logout).
- [x] Built bill entry flows for four bill domains.
- [x] Added merged Records page with search, pagination, and export.
- [x] Added Property Records CRUD (Create/Read/Update).
- [x] Connected Property Records metadata into bill entries and merged records output.
- [x] Added bill-mode sidebar navigation and dynamic field rendering.
- [x] Added upload modal and auto-population flow.
- [x] Expanded Records and Property Records table containers to fill available page height.
- [x] Fixed Excel CSV export compatibility (`####` and scientific notation issues).
- [x] Implemented senior-accessibility high-priority pass:
  - better muted text contrast in light mode
  - minimum 14px for key small text
  - 44x44 touch targets for core controls
  - explicit login error banner
  - explicit toast labels (Success/Error/Info)

## Current Main Plan (Pending Approval)
### Full UI/UX + Senior Accessibility Overhaul
Goal: raise usability/accessibility quality to target level while keeping backend unchanged.

- [x] Medium Priority
  - `:focus-visible` refinements
  - reduced-motion support
  - larger form spacing
  - unify login right-panel background
  - adjust login submit typography
  - dynamic page subtitle prop in layout
  - save/update confirmation prompts
- [x] Low Priority
  - light-mode sidebar polish
  - sticky table headers
  - empty-state CTA blocks
  - mobile hamburger menu
  - web font import consistency
  - upload modal title size tuning

## Proposed Next Task (Completed)
### Centralized Edit Flow From Records -> Property Records
Goal: make editing intentional and unambiguous by starting edits from Records row selection.

- [x] Records page requires explicit row selection before edit.
- [x] Selected row is visually highlighted.
- [x] Edit action is enabled only when a row is selected.
- [x] Clicking Edit redirects to Property Records page.
- [x] Property Records form preloads from selected Records row context.
- [x] Prevent accidental edit without selection (disable button and/or warning toast).
- [x] Keep docs synchronized before and after implementation.

Notes:
- This is a better UX suggestion for control and clarity.
- Technical caveat: Property Records form has property-level fields only; bill-specific columns shown in Records are not editable there unless explicitly added to that form.

## Proposed Next Task (Completed)
### Record-Scoped Full Edit Flow (Property + Bills + Billing Period)
Goal: ensure edit/update targets exactly one selected Records row and never updates sibling months.

- [x] Edit context must include unique bill identity (`bill_id` preferred).
- [x] Records Edit should preload full selected row data (property fields + bill fields + billing period).
- [x] Update must affect only the selected bill row (e.g., March only).
- [x] Never resolve updates by `property + dd` alone.
- [x] Fallback key allowed only when no id exists: `property + dd + billing_period + bill_type`.
- [x] February/March sibling records must stay isolated during edits.

## Proposed Next Task (Completed)
### Edit Button Activation + Property Records Redirect Behavior
Goal: make Records Edit button activation depend only on row selection and route edit flow back to Property Records prefill.

- [x] Edit button is enabled whenever a row is selected/highlighted.
- [x] Edit button remains disabled when no row is selected.
- [x] Clicking Edit redirects to Property Records.
- [x] Property Records preloads selected row values for editing.
- [x] Remove/adjust conditions that disable Edit for specific bill tabs/views unless truly required.

## Proposed Next Task (Completed)
### Period-Safe Record Editing + Bill Field Prefill
Goal: ensure editing one billing-period row (e.g., March) never mutates sibling rows (e.g., February), and preload complete bill data during edit.

- [x] Edit/update must target one exact selected row only.
- [x] Use unique bill identity (`bill_id`) as primary update key.
- [x] Do not update by `DD + Property` only.
- [x] Persist and use `billing_period` in edit context to preserve month isolation.
- [x] Preload all bill-related fields (Water/Electricity/WiFi/Association + Billing Period) from selected Records row during edit flow.
- [x] Confirm February and March remain independent after update.
- [x] Apply the same behavior consistently for WiFi and Association modules.

## Proposed Next Task (Completed)
### Stop Cross-Month Mutation From Property Records Edit
Goal: prevent Records-row edits from mutating shared Property Records values across multiple billing periods.

- [x] Records row edit must not redirect to Property Records for month-specific updates.
- [x] Records row edit must always open bill-specific editor using selected row bill identity (`bill_id` + `billing_period`).
- [x] Property Records form remains for property master updates only (shared metadata).
- [x] Add guardrails/message so users do not use Property Records to edit month-scoped bill values.
- [x] Validate March update does not change February for same DD/Property.
- [x] Hotfix: prevent Property Records sidebar click from bouncing back to Bills (no forced redirect loop).

## Proposed Next Task (Completed)
### Single Monthly Row Model In `property_billing_records`
Goal: use one physical row per `DD + Property + Billing Period` so month edits always touch only one record.

- [x] Built monthly preview table and validated merge output.
- [x] Backed up original `property_billing_records` before migration.
- [x] Migrated live `property_billing_records` to one-row-per-month data.
- [x] Updated API identity/duplicate logic to month-scoped keys (remove `bill_type` from identity).
- [x] Updated merged records output to read monthly rows directly.

## Scope Rules
- Frontend-focused changes only for this plan section.
- No backend/API/database redesign unless explicitly requested.
- Keep `docs/Plan.md` and `docs/Implementation.md` synchronized.

## Approval Rule
- Only implement new pending items after user replies `approved` or `succeed`.

## Current Task: Medium Priority Accessibility Pass (Completed)
- [x] Apply `:focus-visible` cleanup for button focus behavior.
- [x] Add reduced-motion support via `prefers-reduced-motion`.
- [x] Increase form spacing/readability in key form layouts.
- [x] Unify login right-panel background across breakpoints.
- [x] Make page subtitle dynamic via `AppLayout` prop usage.
- [x] Add confirmation prompts for save/update in payment and property record flows.

## Completion Update: Medium Priority Accessibility Pass
- [x] Updated layout to support page-level dynamic subtitles in `AppLayout`.
- [x] Applied medium-priority style refinements in `frontend/src/styles.css` (`focus-visible`, reduced motion, spacing, login panel consistency, login button size).
- [x] Added save/update confirmation prompts in payment and property record flows.

## Current Task: Low Priority Accessibility Polish Pass (Completed)
- [x] Apply light-mode sidebar polish.
- [x] Add sticky table headers.
- [x] Add empty-state CTA blocks for records/property tables.
- [x] Add mobile hamburger sidebar behavior.
- [x] Add web font loading consistency.
- [x] Reduce upload modal title size.

## Completion Update: Low Priority Accessibility Polish Pass
- [x] Updated sidebar light-mode palette and active-state polish.
- [x] Added sticky table headers and empty-state CTA blocks.
- [x] Added mobile off-canvas sidebar with hamburger toggle and backdrop.
- [x] Added Google Font loading in `frontend/index.html`.
- [x] Reduced upload modal title size in `frontend/src/styles.css`.

## Approved Next Plan (Implementation Queue)
Goal: improve code quality and maintainability with low-regression refactors.

- [x] Add automated tests:
  - PHPUnit API smoke tests.
  - Vitest component tests for critical frontend flows.
- [x] Refactor `frontend/src/pages/PaymentFormPage.jsx` into sub-components:
  - `Form`
  - `EditModal`
  - `UploadModal`
- [x] Refactor `api.php` into resource-specific handlers behind a simple router:
  - `bills.php`
  - `property.php`
  - `auth.php`
- [x] Replace runtime `ALTER TABLE` guards with proper SQL migration scripts.
- [x] Replace hardcoded `Admin` / `AD` in layout with dynamic session username + initials.

Execution order:
1. Tests first
2. Payment form split
3. API split
4. Migration system
5. Dynamic session identity in layout

Acceptance checks:
- [x] `phpunit` passes for smoke test suite.
- [x] `vitest` passes for core components.
- [x] `npm.cmd run build` succeeds after refactor.
- [x] `php -l` passes for API/router files.
- [ ] Existing UX flow remains intact for create/edit/upload/navigation.

## Current Task (Approved): Phase 1 Test Foundation
Goal: add a reliable safety net before large refactors.

- [x] Add PHPUnit API smoke tests (DB-independent baseline checks).
- [x] Add Vitest + React Testing Library smoke tests for critical UI rendering.
- [x] Add test scripts and config so tests run with one command per stack.
- [x] Verify green runs:
  - [x] `composer test`
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Add File Introductions
Goal: add a short introduction header to project files for readability and onboarding.

- [x] Add file-header introductions to source files:
  - `.php`, `.js`, `.jsx`: top comment block describing file purpose.
  - `.xml`: XML comment introduction.
- [x] JSON handling rule:
  - JSON does not support comments.
  - Add introduction text only via valid metadata keys where safe (`composer.json`, `frontend/package.json`).
  - Do not modify lock files (`package-lock.json`, `frontend/package-lock.json`) except if explicitly requested.
- [x] Keep behavior unchanged (comments/metadata only, no logic changes).
- [x] Run verification after edits:
  - [x] `php -l` on PHP files.
  - [x] `composer test`
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Approved): iOS + PC Full Compatibility
Goal: ensure all core app functions work consistently on both iOS Safari and desktop browsers.

- [ ] Access and session compatibility:
  - [ ] Validate LAN access path and same-origin session behavior on iOS.
  - [ ] Confirm login/session checks and protected routes behave the same on iOS and PC.
- [ ] Upload compatibility (critical):
  - [x] Support iOS photo upload formats and metadata handling (including HEIC/HEIF path handling strategy).
  - [x] Ensure upload flow does not show false success when parsed bill data is empty.
  - [x] Standardize accepted extraction fields so iOS and PC uploads map to the same form fields.
- [ ] n8n integration robustness:
  - [x] Improve response-shape handling and validation before form auto-population.
  - [x] Add clear user-facing errors for connectivity, timeout, unsupported format, and empty extraction.
  - [x] Support known electricity-bill label variants (e.g., `Customer Acct. No.`, `Billing Month`, `TOTAL CURRENT BILL AMOUNT`, `Current Bill Due Date`).
  - [x] Add module-aware fallback remap (e.g., internet fields -> electricity fields when upload is initiated from Electricity tab).
- [ ] Cross-device QA and verification:
  - [ ] Verify create/update/save/upload flows on iOS and PC for Water, WiFi, Electricity, Association modules.
  - [ ] Verify records visibility sync after save between iOS and PC.
  - [ ] Re-run:
    - [x] `composer test`
    - [x] `npm.cmd run test` (in `frontend/`)
    - [x] `npm.cmd run build` (in `frontend/`)

Status note:
- [x] LAN URL and session endpoint are reachable on local network from host test (`http://192.168.4.101/Finance`).
- [ ] Manual iOS on-device QA is still required for final sign-off.

## Current Task (Completed): Approved Wave Step 2 - Split PaymentFormPage
Goal: reduce complexity and risk by splitting the largest UI module before API refactor.

- [x] Split `frontend/src/pages/PaymentFormPage.jsx` into focused sub-components:
  - [x] `Form`
  - [x] `EditModal`
  - [x] `UploadModal`
- [x] Keep all behavior unchanged (routing, upload, save/update, toasts, edit guards).
- [x] Keep public interfaces stable so later API split is not blocked.
- [x] Verification:
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Approved Wave Step 3 - Split `api.php`
Goal: separate API responsibilities into maintainable resource handlers without changing behavior.

- [x] Split monolithic API into resource-specific modules:
  - [x] `api/auth.php`
  - [x] `api/bills.php`
  - [x] `api/property.php`

## Current Task (Completed): Bills Edit Should Prefill Bill Fields
Goal: ensure Edit in Bills modules loads bill values, not only shared property fields.

- [x] Scope Bills table rows to the active module before showing Edit actions.
- [x] Prevent cross-module rows from appearing in module-specific bill tables.
- [x] Keep explicit module rows with valid billing period visible for edit continuation.
- [x] Fix Property context key mapping fallback for:
  - `real_property_tax`
  - `rpt_payment_status`
- [x] Verify no regression:
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Bills Save Button + Billing Period Rule Clarity
Goal: make Save reliably write to DB and clarify duplicate behavior by billing period.

- [x] Restore a visible Bills form submit action (`Save`/`Update`) wired to form submit.
- [x] Keep `Next` as navigation only; saving is now explicit and predictable.
- [x] Improve error message when the same `DD + Property + Billing Period` already exists.
- [x] Allow save validation when either `DD` or `Property` is present (not `DD` only).
- [x] Clarify behavior:
  - [x] Same `DD/Property` is allowed across different billing periods.
  - [x] Same `DD/Property` in the same billing period is treated as one monthly row and should be updated, not created again.
- [x] Verify no regression:
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Move Billing Period To Property Records
Goal: manage `billing_period` from Property Records only and remove Bills calendar management.

- [x] Add `Billing Period` field to Property Records form and table/list.
- [x] Save/update/delete Property Records by `DD + Property + Billing Period` scope.
- [x] Pass selected Property Record period into Bills flow via shared context.
- [x] Remove Billing Period input/calendar from Bills UI.
- [x] Keep Bills save using period from selected Property Record/context/upload (not manual calendar entry).
- [x] Validate create/edit flows after the move:
  - [x] `php -l api/property.php`
  - [x] `php -l api/bootstrap.php`
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)
- [x] UI copy tweak: replace Property Records helper sentence with live `Billing Period` display in header.
  - [x] shared bootstrap/router entry
- [x] Keep existing endpoint contract stable (`/Finance/api.php?action=...`).
- [x] Preserve auth, CSRF, and upload behavior.
- [x] Verification:
  - [x] `php -l` for new/updated API files
  - [x] `composer test`
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Approved): Approved Wave Step 4 - SQL Migrations
Goal: replace request-time schema mutation with explicit migration scripts and a repeatable migration workflow.

- [x] Add versioned SQL migration files for billing schema requirements:
  - [x] `bill_type`
  - [x] `billing_period`
  - [x] `is_hidden`
- [x] Add migration runner script to apply pending SQL files and track applied versions.
- [x] Remove runtime `ALTER TABLE` execution from API request path.
- [x] Keep API behavior unchanged when schema is already migrated.
- [ ] Verification:
  - [x] `php -l` for updated backend files
  - [ ] run migrations successfully (blocked: local MySQL is not running/reachable)
  - [x] `composer test`
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Approved Wave Step 5 - Dynamic Session Identity
Goal: replace hardcoded sidebar identity labels with live session username and computed initials.

- [x] Use session response username in layout user panel.
- [x] Compute initials dynamically from username.
- [x] Remove hardcoded `Admin` / `AD` values.
- [x] Keep logout behavior unchanged.
- [x] Verification:
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Speed Up "Checking Session"
Goal: reduce time spent on session guard loading and avoid perceived app freeze.

- [x] Frontend session-check performance:
  - [x] Add explicit request timeout for session check.
  - [x] Improve query behavior to avoid unnecessary repeated guard fetches.
  - [x] Show clearer fast-fail message when session endpoint is slow/unreachable.
- [x] Backend responsiveness:
  - [x] Ensure read-only session endpoint is not blocked by long-running requests where possible.
- [x] Validation:
  - [x] Confirm protected routes resolve faster on both PC and iOS.
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)
  - [x] `php -l api.php`

## Current Task (Completed): Suggestions.md Phase 1 Quality Hardening
Goal: implement the highest-value low-risk quality fixes from `docs/Suggestions.md`.

- [x] Add React runtime safety guard:
  - [x] Create `frontend/src/components/ErrorBoundary.jsx`.
  - [x] Wrap app route tree with ErrorBoundary so crashes show a fallback UI instead of a blank screen.
- [x] Clean up unused legacy frontend file:
  - [x] Remove root `script.js` if not referenced by runtime code.
  - [x] Confirm no runtime references remain.
- [x] Refresh project feature documentation:
  - [x] Rewrite `docs/Features.md` to reflect current React + Vite + PHP + MySQL architecture and modules.

Validation:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Suggestions.md Phase 2 Integration Test Coverage
Goal: add integration-style frontend tests for critical billing flows to reduce regression risk.

- [x] Add test coverage for water bill creation flow:
  - [x] Create water bill from Bills form.
  - [x] Verify created record appears in Records (water view).
- [x] Add test coverage for month-scoped edit safety:
  - [x] Edit March water row.
  - [x] Verify February row remains unchanged.
  - [x] Verify update payload includes month-scoped targeting keys.

Validation:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Suggestions.md Phase 3 Live Migration Execution
Goal: complete the blocked migration verification by fixing runner reliability and executing migrations on live DB.

- [x] Fix migration runner execution stability:
  - [x] Handle MySQL unbuffered query edge cases during migration statement execution.
  - [x] Keep migration behavior backward-compatible.
- [x] Run live migrations successfully:
  - [x] Execute `php setup\run_migrations.php` without error.
  - [x] Confirm `schema_migrations` table contains migration versions.
  - [x] Confirm required columns exist in `property_billing_records`:
    - [x] `bill_type`
    - [x] `billing_period`
    - [x] `is_hidden`

Validation:
- [x] `php -l setup\run_migrations.php`
- [x] `php setup\run_migrations.php`

## Current Task (Approved): Android + iOS Compatibility Pass
Goal: make the web app behavior consistent and usable across Android Chrome and iOS Safari.

- [x] Mobile runtime compatibility hardening:
  - [x] Add mobile web app metadata (`viewport-fit`, theme color, manifest links).
  - [x] Add viewport/safe-area CSS to avoid clipped UI on notched devices.
  - [x] Replace critical `100vh` usage with dynamic viewport-safe rules where needed.
- [x] Mobile upload compatibility:
  - [x] Keep normal file picker for PDF/image uploads.
  - [x] Add direct camera capture option for Android/iOS.
  - [x] Preserve existing upload parser and validation behavior.
- [x] Validation:
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)
  - [ ] Manual Android+iOS check:
    - [ ] login
    - [ ] upload/camera flow
    - [ ] save/update for at least one bill module

## Current Task (Completed): Dashboard / KPI Summary Page
Goal: add a dashboard landing page with key monthly finance insights and quick navigation.

- [x] Add dashboard route and landing behavior:
  - [x] Create `/dashboard` protected route.
  - [x] Set app root (`/`) to redirect to `/dashboard`.
  - [x] Keep existing routes unchanged.
- [x] Add KPI summary widgets:
  - [x] Total billed this month.
  - [x] Pending collections (sum of unpaid amounts).
  - [x] Active records count.
  - [x] Recent activity list from latest records.
- [x] Add sidebar navigation:
  - [x] Add Dashboard link in `AppLayout`.
  - [x] Keep current module links intact.
- [x] Validation:
  - [x] `npm.cmd run test` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): 100% Professionalization Program (Phase 1 Foundation)
Goal: push the system from current production-ready state to top-tier professional quality using strict, measurable improvements.

- [x] Define target quality gates (must pass all):
  - [x] Security baseline hardening complete
  - [x] Server-side scalability baseline complete
  - [x] Database consistency and indexing baseline complete
  - [x] Critical-path automated test coverage expanded
  - [x] Zero lint/type/syntax/build failures in CI-style local run

- [x] Security hardening wave:
  - [x] Add login rate-limit / brute-force protection.
  - [x] Add strict security headers and cookie policy review.
  - [x] Add audit logging for auth and write actions.
  - [ ] Add role/permission model planning (`admin`, `editor`, `viewer`).

- [x] Performance and scalability wave:
  - [x] Add server-side pagination/filter/sort for heavy records lists.
  - [x] Add API query/index tuning for common bill/property operations.
  - [x] Reduce frontend payload and render cost for large tables.

- [x] Database quality wave:
  - [x] Finalize `property_list` + `property_billing_records` only architecture.
  - [x] Add/verify FK + high-value indexes.
  - [x] Add data integrity checks and migration safety validation.

- [ ] Codebase quality wave:
  - [ ] Break down large frontend orchestration areas into smaller units/hooks.
  - [ ] Normalize backend helper naming and remove legacy compatibility leftovers.
  - [ ] Expand code comments/docs for critical business logic only.

- [ ] Testing and release wave:
  - [ ] Expand frontend integration tests across all bill modules.
  - [ ] Add backend endpoint tests for auth, validation, and edge cases.
  - [ ] Add regression checklist for mobile + desktop + critical workflows.

Validation (Phase 1 Foundation):
- [x] User approval received before implementation.
- [x] `php -l api/bills.php`
- [x] `php -l api/property.php`
- [x] `php -l api/auth.php`
- [x] `php -l api/bootstrap.php`
- [x] `php setup/run_migrations.php`
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [ ] Manual smoke: login, property list CRUD, all 4 bill save/update flows, records edit/export, mobile layout

## Current Task (Completed): Phase 3 Production Excellence (Wave 1 Foundation)
Goal: establish production-grade delivery and operations baseline with CI automation, health monitoring, and release governance artifacts.

- [x] CI/CD readiness:
  - [x] Add repository CI workflow for backend + frontend checks.
  - [x] Ensure CI runs lint/syntax/tests/build gates.

- [x] Monitoring readiness:
  - [x] Add lightweight API health endpoint for uptime probes.
  - [x] Include DB connectivity health signal in endpoint response.

- [x] Release governance readiness:
  - [x] Add `docs/CHANGELOG.md` baseline.
  - [x] Add `docs/ReleaseChecklist.md` for pre-release sign-off.
  - [x] Add `docs/IncidentRunbook.md` for response handling.

Validation (Phase 3 Wave 1):
- [x] `php -l` on changed PHP files.
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Phase 3 Production Excellence (Wave 2 RBAC + Permission Tests)
Goal: enforce role-based access control at API level and verify permission behavior through automated backend tests.

- [x] RBAC model rollout:
  - [x] Add/verify user role field (`admin`, `editor`, `viewer`) in database.
  - [x] Include role in session/login payload.

- [x] Permission enforcement:
  - [x] Enforce action-level role checks for protected API actions.
  - [x] Return stable forbidden response (`403`) for disallowed actions.

- [x] Test coverage:
  - [x] Add backend tests for role permission matrix and forbidden paths.
  - [x] Keep existing smoke tests green.

Validation (Phase 3 Wave 2):
- [x] `php -l` on changed backend/setup files.
- [x] `php setup/run_migrations.php`
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): UX + Functionality First (Security Deferred by Request)
Goal: prioritize user-friendliness and workflow speed by improving core functions, UI/UX clarity, and day-to-day usability.

- [x] Functional usability wave:
  - [x] Reduce clicks in common flows (property selection -> bill entry -> save).
  - [x] Improve inline validation and user-facing error/help messages.
  - [ ] Add smarter defaults and sticky context between pages/modules.
  - [x] Improve edit/update clarity (record identity, status, and save feedback).

- [x] UI/UX clarity wave:
  - [x] Improve form layout, spacing, and field grouping for fast scanning.
  - [x] Improve table readability (column labels, value formatting, empty states).
  - [x] Improve navigation clarity (active context, breadcrumbs/header cues).
  - [ ] Improve mobile behavior for key daily workflows.

- [x] User-friendliness wave:
  - [x] Add contextual hints/microcopy for confusing fields.
  - [ ] Improve success/failure toasts and action confirmations.
  - [x] Add quick actions for frequent tasks.

Constraints:
- [x] Security enhancements are deferred in this task by user request.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [ ] Manual UX smoke on desktop + mobile for Records, Property List, and all bill modules.

## Current Task (Completed): Remove Bills Helper Strip
Goal: remove the newly added helper strip in Bills page (instruction text + WiFi/Water/Electricity/Association step buttons).

- [x] Remove helper text line from Bills header.
- [x] Remove Bills module stepper row from Bills form header.
- [x] Keep all existing bill form functions unchanged.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Move Association/RPT/Penalty Fields To Property Records
Goal: move property-level fields out of Bills form into Property Records and make labels clearer.

- [x] Move fields to Property Records:
  - [x] `association_payment_status`
  - [x] `real_property_tax`
  - [x] `rpt_payment_status`
  - [x] `penalty`
- [x] Keep Bills flow simple:
  - [x] Remove these four inputs from Bills Association form.
  - [x] Keep Bills save/update auto-using values from selected Property Record context.
- [x] Improve naming clarity in UI labels:
  - [x] `Payment Status Assoc` -> `Association Payment Status`
  - [x] `Payment Status RPT` -> `RPT Payment Status`
  - [x] `Penalty` -> `Penalty Amount`
- [x] Keep Records/Export behavior consistent with moved fields.

Validation:
- [x] `php -l api/bootstrap.php`
- [x] `php -l api/property.php`
- [x] `php -l api/bills.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] `php setup/run_migrations.php`

## Current Task (Completed): Bills Create DB Error Hotfix
Goal: resolve runtime DB error blocking bill record creation.

- [x] Identify root cause from logs (`SQLSTATE[HY093]` on Bills save).
- [x] Fix insert SQL placeholder count mismatch in Bills create query.
- [x] Re-validate backend syntax and insert-path SQL execution.

Validation:
- [x] `php -l api/bills.php`
- [x] SQL insert smoke check via PDO (matching 29 placeholders/values)

## Current Task (Completed): Monthly Property Records With Billing Period
Goal: allow multiple records for one property (e.g., February and March) while showing/managing Billing Period only in Property Records.

- [x] Add `billing_period` to Property Records (`property_list`) and show it in Property Records form/table.
- [x] Allow same `DD + Property` across different months by using month-aware Property Records identity.
- [x] Keep Bills pages without manual Billing Period input.
- [x] Bills should use selected Property Record context (including month) so monthly saves do not overwrite each other.
- [x] Improve Property dropdown labels in Bills to include Billing Period for clarity.

Validation:
- [x] `php setup/run_migrations.php`
- [x] `php -l api/bootstrap.php`
- [x] `php -l api/property.php`
- [x] `php -l api/bills.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] DB uniqueness smoke check (`DD+Property` allows different periods, blocks same period duplicate)

## Current Task (Completed): Move Billing Period To Header And Keep Visible Across Bill Tabs
Goal: remove helper text and place `Billing Period` in the top form header area so users can always see/edit it while moving between bill modules.

- [x] Remove Property Records helper text line.
- [x] Move Property Records `Billing Period` input to the header area.
- [x] Add always-visible `Billing Period` input to Bills header (beside Property/DD selector).
- [x] Keep Billing Period persisted when switching WiFi/Water/Electricity/Association tabs.
- [x] Keep existing save/update behavior unchanged.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Align Bills Header Layout
Goal: align Bills header controls so `Property / DD`, `Billing Period`, helper hint, and action buttons are visually consistent.

- [x] Keep `Property / DD` and `Billing Period` in one aligned grid row.
- [x] Move helper hint to its own row to avoid pushing `Billing Period` downward.
- [x] Keep action buttons aligned with header controls on desktop and mobile.

Validation:
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Show Billing Period In Bills Only
Goal: remove `Billing Period` input from Property Records and keep it visible in Bills only.

- [x] Remove `Billing Period` input/column from Property Records form UI.
- [x] Update Property Records validation text to require only `DD` or `Property`.
- [x] Keep Bills header `Billing Period` field unchanged and visible.
- [x] Allow Property Records create/update without forcing `billing_period` format.

Validation:
- [x] `php -l api/property.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Default Empty Property Records Form
Goal: make Property Records form open with empty fields by default.

- [x] Remove Property Records auto-prefill from stored draft/session selection context on initial form load.
- [x] Keep explicit Records edit context behavior intact.
- [x] Ensure create mode starts from blank values each time route opens.

Validation:
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Preserve Unsaved Property Records State Across Tabs
Goal: keep Property Records unsaved form values when navigating between tabs/routes, and only clear on Save or Cancel.

- [x] Restore Property Records draft/session rehydration on form load.
- [x] Keep explicit Records edit-context override behavior.
- [x] Preserve unsaved values until user clicks Save or Cancel.

Validation:
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Bills Direct Access Must Start Empty
Goal: Bills forms should reset on direct access and only prefill when coming from Property Records via `Next` (create flow).

- [x] Pass explicit route state from Property Records `Next` to Bills (`fromPropertyRecordsNext`).
- [x] On direct Bills access (no route state, no records edit context), clear bill selection/draft context and reset form.
- [x] Keep prefill active when navigating inside Bills flow after Property Records `Next`.
- [x] Keep Records edit-context behavior unchanged.

Validation:
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Fix Property/Bills Navigation Persistence Flow
Goal: keep Property Records empty by default, pass property context on `Next`, and preserve Bills data while navigating until explicit Save/Cancel/Clear.

- [x] Property Records:
  - [x] Default form route now starts empty unless a valid local Property Records draft exists.
  - [x] Removed Bills-shared context auto-prefill from Property Records default create flow.
- [x] Bills:
  - [x] Keep direct access baseline empty only when no persisted draft/context exists.
  - [x] Persist full Bills form state (all fields) continuously in session during navigation.
  - [x] Do not clear Bills drafts automatically when navigating from Property Records via `Next`.
- [x] Clearing behavior remains explicit:
  - [x] Clear only on Save / Cancel / Clear actions.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Restore Bills-to-PropertyRecords Autofill
Goal: when property is selected in Bills, opening Property Records should prefill selected property details.

- [x] Re-enable Property Records hydration from Bills shared selection context (`finance-bill-selection:shared`).
- [x] Keep Property Records local draft priority over shared context.
- [x] Keep fallback default empty create form if neither draft nor selection context exists.

Validation:
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): One Row Per Property In Records
Goal: Records should show a single merged row per property identity instead of separate rows per bill type.

- [x] Switch Records page data source from `list` to merged endpoint `list_merged`.
- [x] Apply bill-view filtering (`All/Water/Electricity/WiFi/Association`) client-side over merged rows.
- [x] Keep search and pagination behavior on the merged dataset.
- [x] Update CSV export to export merged/filtered rows.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Make Property Records Independent From Bills Draft Data
Goal: selecting a property and clicking `Next` should start a fresh Bills flow for that selected property, without carrying old bill values.

- [x] In Bills property-context hydration, prioritize current Property Records context when route state indicates `fromPropertyRecordsNext`.
- [x] Start Bills form from cleared bill fields when coming from Property Records `Next`.
- [x] Keep only property identity/master fields from context for that fresh flow.
- [x] Remove billing-period suffix from property dropdown labels to avoid billing-coupled naming confusion.

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Task 18: Audit Fix Wave — 79 → 85+
Goal: fix the top-ranked gaps from the 79/100 audit, ranked by impact-to-effort ratio.

- [x] Fix #1 — CSS `--text-muted: #000000` in light mode → change to `#64748b`; fix sidebar text colors.
  - File: `frontend/src/shared/styles/styles.css`
- [x] Fix #2 — Add "Total Billed This Month" grand total KPI card to Dashboard.
  - File: `frontend/src/pages/DashboardPage.jsx`
- [x] Fix #3 — Replace dead "Forgot password?" link with admin-contact message.
  - File: `frontend/src/pages/LoginPage.jsx`
- [x] Fix #4 — Add WiFi, Electricity, Association integration tests (mirrors existing Water test).
  - File: `frontend/src/pages/__tests__/BillingFlow.integration.test.jsx`

Validation:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] Manual: light-mode muted text visibly lighter, Dashboard 5th KPI card present, Login page no dead link

## Task 19: Git Repository Setup
Goal: Provide version control for the project so we don't lose configuration or code history again, and push it to GitHub.

- [x] Add extensive `.gitignore` to the project root blocking XAMPP/Windows artifacts, `node_modules`, builds, and DB dumps.
- [x] Initialize git repository (`git init`)
- [x] Stage all existing app files and configuration (`git add .`)
- [x] Create initial application baseline commit (`git commit -m "Initial commit"`).
- [x] Create remote repository and push baseline (`git remote add origin ...` and `git push`).

Validation:
- [x] `git status` shows working tree clean as a baseline.

## Task 20: Application Stability & Resilience
Goal: Implement critical stability mechanisms from the Suggestions document that protect the app from crashing and ensure database integrity.

- [x] Add React `ErrorBoundary` specifically to catch UI render crashes (Suggestion #3).
- [x] Wrap `App.jsx` child routes in the boundary so the sidebar remains functional upon a crash.
- [x] Run the SQL Database migrations (`setup/run_migrations.php`) to ensure table schemas match the codebase (Suggestion #2).

## Proposed Next Tasks (Pending Approval): 100% Roadmap (91 → 100%)

## Task 21 — PHPUnit Backend Tests (+5 pts)
- [x] Create `backend/tests/Unit/AuthTest.php` — test role logic, RBAC matrix
- [x] Create `backend/tests/Unit/BillsValidationTest.php` — test bill field validation
- [x] Create `backend/tests/Unit/PropertyRecordTest.php` — test property record structure
- [x] Run `vendor/bin/phpunit --testdox` and confirm all pass (43 tests, 103 assertions ✅)

## Task 22 — Cross-Month Edit Isolation Test (+2 pts)
- [x] Add test to `BillingFlow.integration.test.jsx`: edit Feb record (id 302), assert Jan (id 301) untouched
- [x] Run `npm.cmd run test -- --run` — 11 tests pass ✅

### Task 23 — Update `Features.md` Docs (+1 pt)
- [ ] Replace old Vanilla JS / Tailwind references with React + Vite stack description

### Task 24 — iOS Safari On-Device QA (+1 pt)
- [ ] Manually test login, bill entry, upload, and Records sync on iPhone/iPad Safari
