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

## Task 23 — Update `Features.md` Docs (+1 pt)
- [x] Replace old references with complete current stack: React 18, Vite 5, PHP 8.2, PHPUnit 11
- [x] Added API action table, module structure, test count summary, architecture decisions ✅

### Task 24 — iOS Safari On-Device QA (+1 pt)
- [ ] Manually test login, bill entry, upload, and Records sync on iPhone/iPad Safari

---

## Task 25 — Bill Tab Transition (Stable Card, Animated Fields)

**Problem:** Each bill tab (WiFi / Water / Electricity / Association) is a separate route, so switching tabs fully unmounts and remounts `PaymentFormPage`, causing the whole card/header to flash.

**Goal:**
- Card container and header stay **completely stable** when switching tabs
- Only the input fields section plays a smooth **slide-fade animation** (220ms)
- Header text ("WiFi Bills" → "Water Bills") updates **instantly and silently**

**Implementation:**
- [x] Merge 4 bill routes into one: `/bills/:billType` in `App.jsx`
- [x] `PaymentFormPage` reads `billMode` from `useParams()` instead of props
- [x] Wrap module-specific fields in `<div className="fields-section">` with CSS animation triggered on `billMode` change
- [x] Add `@keyframes fieldsSlideIn` (opacity 0→1, translateY 10px→0) to global CSS
- [x] Old URLs (`/bills/water`, `/bills/wifi`, etc.) redirect to new param route
- [x] Run `npm.cmd run test -- --run` — all 11 tests still pass

---

## Task 26 — Persistent Bill Form Card (Anti-Flash)

**Problem:** Navigation between bill tabs (WiFi / Water / etc.) causes the outer "Bills Form" white card to visually flash and reload. This happens because `AppLayout.jsx` uses the exact URL path (`/bills/water`, `/bills/wifi`) as the React `key` for the page content, forcing a full unmount of the card container on every tab click.

**Goal:**
- The outer Bills Form card (background, border, buttons) should stay completely persistent and mounted when switching tabs.
- Only the inner fields should re-render and trigger the slide-fade animation added in Task 25.

**Implementation:**
- [ ] In `AppLayout.jsx`, compute a stable `transitionKey`.
- [ ] If the path starts with `/bills/`, use `"bills-module"` as the key instead of the exact path.
- [x] Apply `key={transitionKey}` to the `<div className="route-transition-layer">`.
- [x] Run `npm.cmd run test -- --run` to verify UI shell tests still pass.

---

## Task 27 — Bill Form Card Height Limit (Refined)

**Problem:** The previous fix (aligning with the top of "LOG OUT") made the card stop too early.

**Goal:** Extend the card downward so its bottom edge aligns with the **bottom** of the "LOG OUT" text in the sidebar.

**Implementation:**
- [x] In `styles.css` (around line 473), reduce `margin-bottom` from `77px` to `24px`.

---

## Task 28 — Persistent Layout for Records & Property Records (Refined)

**Problem:** Navigation within "Records" and "Property Records" causes the entire white card to "flash" or animate even with stable keys. This is due to split routes and global transitions in the layout.

**Goal:** Keep the outer card container (background and borders) completely frozen while only the inner data/table content updates smoothly.

**Implementation:**
- [x] In `App.jsx`, consolidate `/property-records` and `/property-records/list` into a single route to prevent remounting.
- [x] In `AppLayout.jsx`, update the `transitionKey` logic and add a `no-module-transition` class for stable modules (Bills, Records, Property Records).
- [x] In `styles.css`, add CSS to disable global animations when the `no-module-transition` class is present.
- [x] Ensure internal animations in `RecordsPage.jsx` and `PropertyRecordsPage.jsx` are correctly scoped to the inner content.

---

## Task 29 — Dynamic Header Title for Bills Module

**Problem:** The header title says "Bills" for all bill types (WiFi, Water, etc.), which is confusing for the user. It should update to match the active tab.

**Goal:** Update the page title to "WiFi Bills", "Water Bills", "Electricity Bills", or "Association Bills" dynamically as the user switches tabs.

**Implementation:**
- [x] In `PaymentFormPage.jsx`, create a label mapping for `billMode`.
- [x] Pass the mapped label as the `title` prop to `AppLayout`.
- [x] Ensure the update is seamless and does not trigger any card remounts.

---

## Phase 4: Technical Debt & Quality Gates (Proposed)

**Problem:** As the application has grown, core files (`PaymentFormPage.jsx`, `styles.css`, `LegacyBills.php`) have become extremely large (1800-2200 lines). There are no automated quality gates (linting, formatting, type checking) in the CI/CD pipeline, increasing the risk of silent bugs and making future development slower and riskier.

**Goal:** modularize the codebase, enforce code formatting, and introduce static analysis to ensure long-term maintainability without altering the end-user experience.

### Task 30 — Frontend Modularization (`PaymentFormPage.jsx`)
- Break down the ~2000-line `PaymentFormPage.jsx` into smaller, focused React components (e.g., `BillFormContainer`, `BillTable`, `UploadOCRModal`, `PaginationControl`).
- Extract the complex OCR parsing logic into a dedicated utility file (`/src/shared/lib/ocrParser.js`).

### Task 31 — CSS Modularization (`styles.css`)
- Split the monolithic `styles.css` (~2200 lines) into feature-specific CSS Modules or smaller stylesheets (e.g., `Dashboard.css`, `BillsForm.css`, `Auth.css`).
- Resolve global namespace collisions.

### Task 32 — Quality Gates Configuration
- **ESLint & Prettier:** Install and configure strict linting rules for React best practices.
- Add a `"lint"` and `"format"` script to `package.json`.
- Optional: Add basic PropTypes or adopt TypeScript definitions via JSDoc for safer API responses.

### Task 33 — Backend Refactoring (Legacy PHP)
- Refactor `LegacyBills.php` (~874 lines) and `LegacyBootstrap.php` into modern, single-responsibility Controller and Service classes.
- Extract generic database query wrappers to reduce duplication.

---

## Phase 5: Batch Bill Scan Review + Modularization (Pending Approval)

**Goal:** support multi-file bill upload with review/edit before save, while continuing frontend/backend modularization with safe incremental changes.

### Task 34 — Multi-File Upload + Review Tab (All Bill Modules)
- Add multi-file support in upload UI and handler (process all selected files).
- Auto-scan each file and collect parsed outputs into a module-specific in-page Review tab.
- Keep existing `/bills/{module}/list` saved-records route unchanged.
- In Review tab:
  - show all scanned rows in a table/list
  - show scan status per row (scanned / needs review / failed)
  - allow inline edits for missing/incorrect fields
  - require property resolution (`property_list_id`) before save
  - save finalized rows with per-row save actions
- Continue batch processing even if some files fail; show per-file error messages.

### Task 35 — Bills Frontend Component Decomposition
- Split `PaymentFormPage.jsx` into smaller components/hooks (e.g., form fields, table panel, upload/review panel, state hook).
- Keep current behavior, routes, and API contracts stable during refactor.
- Preserve existing keyboard/save/edit flows and Records-driven edit context.

### Task 36 — Stylesheet Decomposition
- Split monolithic `styles.css` into feature-scoped stylesheets/modules (Bills, Dashboard, Records, Auth/Layout).
- Avoid visual regressions; preserve existing theme and responsive behavior.

### Task 37 — Backend Bills Strangler Refactor
- Migrate logic from `LegacyBills.php` action-by-action into isolated controller/service/repository/upload classes.
- Keep `action` API contract stable (`list`, `add`, `bill_update`, `upload_bill`, `list_merged`).
- Add/extend tests around upload parsing/failure paths and bill create/update flows after each migrated action.

### Task 39 — Dedicated Sidebar Bill Review Queue
- Add independent sidebar entry `Bill Review` and route `/bills/review`.
- Support uploading mixed bill files from one review queue page.
- Show all scanned rows in one list with `bill_type`, status, and editable fields.
- Enable row-level `Edit`, `Save Row`, `Remove`, plus `Save Selected` batch action.
- Persist review queue locally in browser storage to survive navigation/reload.
- Remove in-module Bills Review tab/functionality from individual bill pages to avoid duplicate review flows.

**Execution Status:** [x] Completed (2026-03-03)

### Task 38 — Sample Bill Detection Validation Matrix (Approved)
- Validate parser coverage using local sample files in `Examples/Excel/` and `Examples/Samples/`.
- For each sample, capture field-level detection results:
  - detected correctly
  - detected but normalized/adjusted
  - missing/not detected
- Output a module-wise matrix for core fields:
  - water: `water_account_no`, `water_amount`, `water_due_date`, `water_payment_status`
  - internet: `internet_account_no`, `wifi_amount`, `wifi_due_date`, `wifi_payment_status`
  - electricity: `electricity_account_no`, `electricity_amount`, `electricity_due_date`, `electricity_payment_status`
  - association: `association_dues`, `association_due_date`, `association_payment_status`
- Record required parser rule updates (label aliases/regex additions) per missed field.
- Update plan status with completion notes after validation run.

**Execution Status:** [x] Completed (2026-03-03)

**Artifacts:**
- `Examples/Samples/parser_validation_input.json`
- `Examples/Samples/parser_validation_report.json`
- `Examples/Samples/parser_validation_report.md`

**Summary Findings:**
- 5/5 sample files had correct bill-type detection and passed required-field validation.
- Strong coverage:
  - water sample: all core target fields detected
  - wifi sample: all core target fields detected
  - one electricity sample (`MANABE...pdf`): all core target fields detected
- Gaps observed:
  - electricity sample `8183_SW-9E...pdf`: missing `electricity_account_no` and `electricity_due_date`
  - electricity sample `Examples/Samples/electricity-bill-sample.pdf`: missing `electricity_due_date`
- Follow-up parser improvements needed:
  - extend due-date pattern variants for electricity templates
  - add account-number label aliases for utility invoices that do not use current account keywords

**Parser Patch Update (2026-03-03, same task):**
- [x] Expanded electricity due-date pattern coverage (`YYYY-MM-DD`, `Month DD, YYYY`, and non-colon due-date formats).
- [x] Improved bill-type detection strategy to reduce cross-module misrouting in mixed-format OCR results.
- [x] Tightened internet-provider extraction to avoid overly generic `Provider:` captures.
- Validation rerun result:
  - water sample: correct module + full target field detection
  - wifi sample: correct module + full target field detection
  - electricity samples: correct module + full target field detection for 2/2
  - association invoice sample (`8183_SW-9E...pdf`): correct module, but `association_due_date` still missing

---

## Active Approved Roadmap (Phase-Gated Delivery)
### Project Goal (Simple, Non-Programmer Friendly)
We will improve the app navigation and add a new **Expenses** module.
Existing billing behavior will stay working the same.
Work will be done in small phases, and we will pause for your approval after every phase.

### Approval Rules (Strict)
- Phase 1 is documentation only in this file (`docs/Plan.md`).
- No app code changes are allowed before your approval.
- After each implementation phase, stop and wait for your approval before the next phase.

### New Features Planned
- New sidebar structure:
  - Dashboard
  - Records
  - Billings
  - Bills Review
  - Expenses
- New frontend routes:
  - `/billings`
  - `/records`
  - `/records/bills`
  - `/records/expenses`
  - `/expenses`
- New backend actions for Expenses:
  - `expense_list`
  - `expense_create`
  - `expense_update`
  - `expense_delete`
- New database table:
  - `expenses`

### Important Safety Constraints
- Do not change existing billing/property endpoint behavior.
- Do not change existing billing calculations.
- Do not change Bills Review logic.
- Add new Expenses logic as separate module.

### Phase Status Tracker
- [x] Phase 1: Plan document update (this section) completed.
- [x] Phase 2: Sidebar + route structure refactor.
- [x] Phase 3: Billings module tabs + step flow.
- [x] Phase 4: Records module split (Bills Records / Expenses Records).
- [x] Phase 5: Expenses backend (table + API + RBAC + CSRF).
- [x] Phase 6: Expenses form + expenses records UI.
- [x] Phase 7: Expenses OCR (client-side, images + PDF).
- [x] Phase 8: Regression testing + final polish.

### Phase Details
#### Phase 1 - Plan Document Update (No App Code)
What users will notice:
- No UI change yet.
- Roadmap is documented clearly for review and approval.

Technical checklist:
- [x] Add plain-language roadmap.
- [x] Add phase-by-phase implementation sequence.
- [x] Add approval gates after every phase.

Stop point:
- Wait for user approval before Phase 2.

#### Phase 2 - Sidebar + Route Structure Refactor
What users will notice:
- Sidebar modules become: Dashboard, Records, Billings, Bills Review, Expenses.
- Four separate bill buttons are removed from sidebar.

Technical checklist:
- [x] Update `AppLayout` navigation links.
- [x] Add/adjust routes in `frontend/src/app/App.jsx`.
- [x] Keep existing bill routes (`/bills/*`) working.
- [x] Keep `/bills/review` behavior unchanged.

Stop point:
- Wait for user approval before Phase 3.

#### Phase 3 - Billings Module Tabs + Step Flow
What users will notice:
- Clicking **Billings** opens a guided flow in this order:
  1. Property Records
  2. Wifi Bills
  3. Water Bills
  4. Electricity Bills
  5. Association Bills
- Users can click tabs directly and still use Next/Back.

Technical checklist:
- [x] Add shared Billings tab/step navigation component.
- [x] Integrate with Property Records and Bills pages.
- [x] Keep unsaved data when switching tabs.
- [x] Keep existing save/update logic unchanged.

Stop point:
- Wait for user approval before Phase 4.

#### Phase 4 - Records Module Split
What users will notice:
- Clicking **Records** first shows two buttons:
  - Bills Records
  - Expenses Records

Technical checklist:
- [x] Add records landing page.
- [x] Move existing records table to `/records/bills`.
- [x] Add `/records/expenses` view shell.

Stop point:
- Wait for user approval before Phase 5.

#### Phase 5 - Expenses Backend
What users will notice:
- Expenses data can be saved to database.

Technical checklist:
- [x] Add `expenses` SQL migration.
- [x] Add backend Expenses module/controller.
- [x] Add API actions: list/create/update/delete.
- [x] Add RBAC mapping and CSRF write protection.

Stop point:
- Wait for user approval before Phase 6.

#### Phase 6 - Expenses Form + Expenses Records UI
What users will notice:
- New **Expenses** page with card form:
  - Date
  - Payee
  - Description (large textarea)
  - Category
  - Amount
  - Remarks
  - Payment (payment method)
  - TIN Number
  - Non-VAT
  - OCR button
- New Expenses Records page with search/edit/delete/export.

Technical checklist:
- [x] Build Expenses form page and API integration.
- [x] Build Expenses records table page.
- [x] Keep light/dark theme consistency.
- [x] Add CSV export for expenses records.

Stop point:
- Wait for user approval before Phase 7.

#### Phase 7 - OCR for Expenses (Client-Side)
What users will notice:
- OCR button can scan receipt images/PDF and auto-fill fields when detected.

Technical checklist:
- [x] Add client OCR integration.
- [x] Support images + PDF OCR (first pages).
- [x] Add field-mapping parser heuristics.
- [x] Keep full manual edit capability.

Stop point:
- Wait for user approval before Phase 8.

#### Phase 8 - Regression + Final Polish
What users will notice:
- Existing billing flows still work.
- New expenses flows are stable and documented.

Technical checklist:
- [x] Run frontend + backend test suites.
- [x] Verify Bills Review unchanged.
- [x] Verify existing billing endpoints unchanged.
- [x] Final documentation updates.

Completion note (March 4, 2026):
- Expenses backend CRUD endpoints and migration are implemented.
- Billings module tabs/step flow is implemented and keeps unsaved drafts.
- Records module is split into Bills Records and Expenses Records.
- Expenses OCR supports image/PDF upload with auto-fill heuristics.

Final sign-off:
- User approval required for completion.

---

## Error Remediation Wave (March 4, 2026)
Goal: fix critical functional issues found during full-system review using approval-based phases.

### Phase Tracker
- [x] Phase 1: Backend payload validation + unit tests.
- [x] Phase 2: Records edit-flow safety hardening + frontend test updates.
- [x] Phase 3: Manual end-to-end QA pass for high-risk flows and remaining UX edge cases.

### Phase 1 - Completed
- [x] Fixed Expenses validation so empty amount no longer saves as `0.00`.
- [x] Fixed bill `add`/`bill_update` JSON validation to accept valid empty-object JSON payloads.
- [x] Added/updated backend tests:
  - `backend/tests/Unit/ExpensesValidationTest.php`
  - `backend/tests/Unit/BillsValidationTest.php`

### Phase 2 - Completed
- [x] Hardened Bills Records edit flow to resolve selected row from current filtered data by row key (prevents stale row-state edits).
- [x] Added multi-module edit guard path in Records edit handling and kept no-ID protection behavior.
- [x] Fixed duplicate React table-header keys in Bills Records table (removed repeated-key warnings).
- [x] Extended frontend integration tests for this edit-protection scenario:
  - `frontend/src/features/bills/__tests__/BillingFlow.integration.test.jsx`

Validation:
- [x] `php vendor/bin/phpunit -c phpunit.xml` (in `backend/`)
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Stop point:
- Final sign-off.

### Phase 3 - Completed
- [x] Verified route accessibility on local server (`/dashboard`, `/records`, `/records/bills`, `/records/expenses`, `/billings`, `/bills/wifi`, `/bills/review`, `/expenses`) with HTTP 200 responses.
- [x] Verified authenticated API flow using live session + CSRF token:
  - [x] login/session (`admin` role)
  - [x] expenses validation (`Amount is required.`)
  - [x] expenses create/update/list/delete end-to-end
  - [x] bills `add` empty-object payload returns business validation message (not JSON syntax error)
  - [x] `list_merged` returns success
  - [x] health endpoint reports DB connected
- [x] Verified CSRF enforcement (`Invalid or missing CSRF token.` on protected write without token).
- [x] Verified RBAC enforcement with temporary `viewer` user:
  - [x] `list_merged` allowed
  - [x] `expense_create` denied (`Forbidden`)
- [x] Regression checks re-run:
  - [x] `php vendor/bin/phpunit -c phpunit.xml` (backend)
  - [x] `npm.cmd run test -- --run` (frontend)
  - [x] `npm.cmd run build` (frontend)

Residual manual checks (device-only):
- [ ] Physical-phone UI walkthrough (iOS Safari / Android Chrome) still needed for final mobile UX sign-off.

---

## Risk Mitigation Track (Approved) - Step 1
### Deterministic Account-to-Property Auto-Fill
Goal: prevent wrong property auto-fill when account-number matches are ambiguous.

Scope for Step 1:
- Backend lookup behavior only (no visual redesign).
- Keep existing upload/OCR flow and API contract stable.

Step 1 checklist:
- [x] Add dedicated account directory table for property-linked account numbers (`property_account_directory`).
- [x] Import January/February/March account mappings into the directory.
- [x] Connect directory to `property_list` using `property_list_id` with FK cascade (`ON DELETE CASCADE`).
- [x] Sync directory links on Property Record create/update.
- [x] Use directory as lookup fallback for `account_lookup_search` so detected account numbers can auto-fill property.
- [x] Backfill and link previously unmatched property rows.
- [x] Add explicit ambiguity handling rule when multiple active rows share the same normalized account (return `needs_review` instead of auto-fill).
- [x] Add tests for ambiguity scenarios (backend + frontend integration).

Acceptance criteria for Step 1:
- Account detection auto-fills the correct property when a unique mapping exists.
- Deleting a property record deletes linked account mapping row automatically.
- No regression in bill create/update/upload and records flows.

---

## Risk Mitigation Track (Approved) - Step 2
### OCR Parser Regression Guard + Sample Validation Automation
Goal: prevent OCR parser regressions (especially mixed Association + Water invoices) from reappearing silently.

Step 2 checklist:
- [x] Added parser validation automation script:
  - [x] `infra/scripts/validate-ocr-parser-samples.mjs`
  - [x] Supports `--write` (refresh reports) and `--check` (CI gate).
- [x] Added explicit expected outputs in `Examples/Samples/parser_validation_input.json` for:
  - [x] mixed invoice (`association_dues = 7440.00`, `water_amount = 215.00`)
  - [x] due-date and payment-status expectations.
- [x] Fixed parser extraction edge cases in `frontend/src/shared/lib/ocrParser.js`:
  - [x] handle OCR-glued tokens (e.g., `2026Due Date`) during text parsing
  - [x] prioritize parsed water line-item amount over fallback totals
  - [x] normalize noisy payment-status values (`Unpaid Reference ...` -> `Unpaid`)
  - [x] relax WiFi required fields to avoid false negatives when provider is missing.
- [x] Regenerated parser validation reports:
  - [x] `Examples/Samples/parser_validation_report.json`
  - [x] `Examples/Samples/parser_validation_report.md`
- [x] Added CI/release quality gates:
  - [x] `.github/workflows/ci.yml`
  - [x] `infra/ci/finance-ci.yml`
  - [x] `docs/operations/ReleaseChecklist.md`

Acceptance criteria for Step 2:
- Parser validation passes `5/5` sample files.
- Mixed Association invoice correctly yields:
  - `association_dues = 7440.00`
  - `water_amount = 215.00`
- Existing billing integration tests and frontend build remain green.


