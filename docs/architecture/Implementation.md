# Implementation Details (Short Version)

## Stack and Structure
- Frontend: React (Vite), React Router, TanStack Query
- Backend: PHP (`api.php`, session auth)
- Database: MySQL

Main frontend files:
- `frontend/src/components/AppLayout.jsx`
- `frontend/src/pages/RecordsPage.jsx`
- `frontend/src/pages/PaymentFormPage.jsx`
- `frontend/src/pages/PropertyRecordsPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/components/Toast.jsx`
- `frontend/src/styles.css`

## Completed Implementation Summary
- [x] React migration completed and set as default UI entry.
- [x] Auth hardened with dedicated session/login API checks.
- [x] Four bill flows implemented (`water`, `internet`, `electricity`, `association_dues`).
- [x] Records merge logic implemented by `DD + Property` fallback `DD`.
- [x] CSV-exact records model integrated with frontend and API.
- [x] Property Records CRUD module implemented.
- [x] Property records connected into merged records output.
- [x] Records and Property Records table panels stretched to fill content height with internal scrolling.
- [x] CSV export updated for Excel-safe output + UTF-8 BOM.

## Latest Completed Task
### Senior Accessibility High-Priority Pass
- [x] Improved light-mode muted text contrast token.
- [x] Raised key small-text UI elements to minimum 14px.
- [x] Enforced 44x44 touch target baseline for primary controls.
- [x] Added explicit login error banner text in `LoginPage.jsx`.
- [x] Added explicit toast type labels in `Toast.jsx`.
- [x] Preserved loading/saving submit text behavior in payment/property flows.

Files updated in this pass:
- `frontend/src/styles.css`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/components/Toast.jsx`
- `docs/Plan.md`
- `docs/Implementation.md`

Verification:
- [x] `npm.cmd run build`

## Pending Queue (Not Yet Implemented)
### Full UI/UX + Senior Accessibility Overhaul
- [x] Medium Priority
  - focus-visible cleanup
  - reduced-motion support
  - form spacing improvements
  - login right-panel consistency
  - layout subtitle prop cleanup
  - confirmation prompts for save/update
- [x] Low Priority
  - sidebar visual polish in light mode
  - sticky table headers
  - empty-state CTAs
  - mobile hamburger menu
  - typography/font-loading polish

## Current Task (Completed)
### Centralized Edit/Update Entry Point in Records
- [x] **Scope**:
  - Move edit initiation to `RecordsPage.jsx` via row selection + Edit button.
  - Redirect to `PropertyRecordsPage.jsx` with selected row payload.
  - Preload Property Records form from selected Records row.
  - Guard edit action when no row is selected.
- [x] **Files Planned to Update**:
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx`
  - `frontend/src/components/AppLayout.jsx` (only if navigation guard wiring is needed)
  - `frontend/src/styles.css` (selected-row highlight style)
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Add row-selection state in Records table and selected-row highlight class.
  2. Add page-level Edit button in Records and disable it when no row is selected.
  3. On Edit click, persist selected row context in `sessionStorage` and navigate to `/property-records`.
  4. In Property Records page, load selected Records context on mount and prefill form values.
  5. Keep fallback behavior if context is missing or malformed.
  6. Show warning toast when Edit is attempted without selection (if button is not disabled in a given state).
  7. Run `npm.cmd run build`.
- [x] **Data Mapping Rule**:
  - Property Records form fields must map exactly from selected row keys: `dd`, `property`, `unit_owner`, `classification`, `deposit`, `rent`, `real_property_tax`, `rpt_payment_status`, `penalty`, `per_property_status`.
  - Bill-specific columns remain visible in Records but are out of edit scope in Property Records unless a schema/form extension is approved.
- [x] **Non-Goals**:
  - No backend/API/database schema changes.
  - No merged-record computation changes.
- [x] **Approval Hold**:
  - User approved before implementation.

## Current Task (Completed)
### Fix Record Identification For Edit/Update (Rows with Same DD/Property Across Months)
- [x] **Scope**:
  - Change edit handoff to carry unique bill identity from Records row selection.
  - Preload full row values into a bill-edit form (including billing period and bill-specific fields).
  - Update only the selected bill record; do not update sibling records sharing `dd/property`.
- [x] **Files Planned to Update**:
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `frontend/src/lib/api.js` (if payload shaping needs adjustment)
  - `api.php` (only if id fallback/validation path requires tightening)
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Ensure selected Records row stores `id`, `bill_type`, and `billing_period` in context payload.
  2. Route Edit from Records to the corresponding Bills page (water/electricity/wifi/association) instead of Property Records when bill fields are expected.
  3. In Bills form, hydrate all displayed fields from context and lock edit target to `editingBillId`.
  4. On save/update, call `bill_update` with that `id` and preserve record-scope validation.
  5. Add defensive fallback matching only when `id` is unavailable: `property + dd + billing_period + bill_type`.
  6. Verify scenario: edit March row should not mutate February row.
  7. Run `npm.cmd run build` and PHP syntax checks.
- [x] **Validation Cases**:
  - Select March record, edit amount/status, save -> only March row changes.
  - February row remains unchanged.
  - Attempt edit without selected row -> warning or disabled action.
  - Billing period remains populated during edit mode.
- [x] **Non-Goals**:
  - No schema redesign.
  - No changes to unrelated Property Records CRUD behavior.
- [x] **Approval Hold**:
  - User approved before implementation.

## Current Task (Completed)
### Enable Records Edit Button Based On Row Selection Only
- [x] **Scope**:
  - Update disabled-state logic so Records Edit activates only when a row is selected.
  - Keep Edit disabled when no selection exists.
  - Redirect Edit to Property Records and prefill selected row data.
- [x] **Files Planned to Update**:
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx`
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Review current `disabled` condition for Records Edit button.
  2. Remove non-selection constraints from button activation logic.
  3. Ensure selected row payload is written to context storage on Edit click.
  4. Ensure redirect target is `/property-records`.
  5. Confirm Property Records loads the context and sets form values.
  6. Validate no-row-selected state keeps button disabled.
  7. Run `npm.cmd run build`.
- [x] **Validation Cases**:
  - Select row -> Edit becomes active.
  - No selected row -> Edit remains disabled.
  - Click Edit -> redirect to Property Records and fields are prefilled.
- [x] **Non-Goals**:
  - No backend schema/API redesign.
  - No changes to unrelated bills CRUD behavior.
- [x] **Approval Hold**:
  - User approved before implementation.

## Current Task (Completed)
### Fix Cross-Period Update Bug + Empty Bills Edit Fields
- [x] **Scope**:
  - Prevent cross-period updates when DD/Property are shared across months.
  - Ensure selected Records row opens edit flow with full bill field values and billing period.
  - Ensure update applies only to selected bill row identity.
- [x] **Files Planned to Update**:
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx` (if handoff guard/cleanup is needed)
  - `frontend/src/lib/api.js` (only if payload helper changes are needed)
  - `api.php` (only if merged payload mapping must be expanded/fixed)
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Ensure Records selection context carries exact row identity: `bill_id`, `bill_type`, `billing_period`, and all bill field values.
  2. Route edit flow to the correct Bills page for the selected bill type when row-specific bill editing is required.
  3. Hydrate Bills form directly from selected Records context, including billing period and module-specific fields.
  4. Lock update operation to `editingBillId` and send that id to `bill_update`.
  5. Keep Property Records updates scoped to property master records only (no accidental bill overwrites).
  6. Remove any fallback that effectively updates by `DD + Property` only.
  7. Validate with two records (same DD/Property, Feb/Mar): editing March must not change February.
  8. Run `npm.cmd run build` and PHP syntax checks.
- [x] **Validation Cases**:
  - Select March row -> edit -> save -> only March row changes.
  - February row remains unchanged.
  - Bills edit form loads Billing Period and bill-specific values from selected row.
  - Bills context hydrates module-specific edit identity for Water/Electricity/WiFi/Association.
  - No regression in property master editing.
- [x] **Non-Goals**:
  - No schema redesign beyond what existing API payloads already support.
  - No changes to authentication/session flow.
- [x] **Approval Hold**:
  - User approved before implementation.

## Current Task (Completed)
### Enforce Month-Scoped Editing Path (Records -> Bills Only)
- [x] **Scope**:
  - Remove month-specific edit handoff from Records to Property Records.
  - Route selected Records row edits to module-specific Bills page only.
  - Keep Property Records updates as shared master-record edits only.
- [x] **Files Planned to Update**:
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx` (context handling guard)
  - `frontend/src/pages/PaymentFormPage.jsx` (ensure context always resolves by module bill id)
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Change Records Edit redirect to module route using `water_bill_id/electricity_bill_id/internet_bill_id/association_bill_id`.
  2. Include `editing_bill_id`, `bill_type`, `billing_period`, and full row values in edit context payload.
  3. Keep Bills form hydration keyed by active module id and preserve month period in form.
  4. In Property Records, ignore month-scoped Records edit context and show explanatory warning/CTA to Bills when applicable.
  5. Verify Update calls target `bill_update` with exact `id`.
  6. Run `npm.cmd run build` and PHP syntax checks.
- [x] **Validation Cases**:
  - Select March row -> edit -> update -> only March changes.
  - February for same DD/Property remains unchanged.
  - Billing Period and bill-specific fields are prefilled on edit.
  - Property Records still updates master data only.
  - Property Records navigation does not auto-redirect/bounce to Bills when clicked manually from sidebar.
- [x] **Non-Goals**:
  - No schema redesign.
  - No changes to authentication/session flow.
- [x] **Approval Hold**:
  - User replied `approved`; implementation completed.

Hotfix note:
- Updated `frontend/src/pages/PropertyRecordsPage.jsx` to consume month-scoped Records context by preloading master fields (DD/Property/etc.) and clearing context, instead of forcing an immediate redirect back to Bills.

## Current Task (Completed)
### Migrate To One Monthly Row Per Property In `property_billing_records`
- [x] **Database work**:
  - Created `property_billing_records_monthly_preview` for validation.
  - Created backup table: `property_billing_records_backup_20260223_130830`.
  - Replaced live `property_billing_records` data with consolidated monthly rows.
- [x] **Backend/API updates (`api.php`)**:
  - Identity uniqueness now uses `dd + property + billing_period` (not `bill_type`).
  - Duplicate hider now collapses by month key only.
  - `list_merged` now emits monthly rows directly and maps all bill-id keys to the monthly row `id`.
  - `bill_update` lock now month-scoped (`id + dd + property + billing_period`).
- [x] **Frontend adjustments**:
  - `PaymentFormPage.jsx` no longer assumes one row per `bill_type` when resolving existing monthly records.
- [x] **Verification**:
  - `php -l api.php`
  - `npm.cmd run build`

## Non-Goals for Pending Queue
- No backend/API schema changes.
- No route architecture rewrite.

## Approval State
- Pending queue requires explicit user approval before coding.

## Current Task: Medium Priority Accessibility Pass (Completed)
- [x] **Scope**:
  - Implement all approved medium-priority accessibility and UX refinements.
  - Keep backend/API/database unchanged.
- [x] **Files Planned to Update**:
  - `frontend/src/styles.css`
  - `frontend/src/components/AppLayout.jsx`
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx`
  - `docs/Plan.md`, `docs/Implementation.md`
- [x] **Implementation Steps**:
  1. Move button ring behavior to `:focus-visible`-first styling.
  2. Add `prefers-reduced-motion: reduce` CSS block.
  3. Increase form spacing/label readability in shared form grid.
  4. Normalize login right-panel background color across responsive breakpoints.
  5. Add `subtitle` prop support to `AppLayout` and pass page-specific subtitles.
  6. Add confirmation prompts before save/update actions in payment/property flows.
  7. Run `npm.cmd run build`.
- [x] **Non-Goals**:
  - No backend endpoint changes.
  - No schema or routing redesign.
- [x] **Approval Hold**:
  - Approved by user.

## Completion Update: Medium Priority Accessibility Pass
- [x] Updated `frontend/src/styles.css` with medium-priority refinements:
  - button focus ring behavior on `:focus-visible`
  - `@media (prefers-reduced-motion: reduce)` support
  - improved form grid spacing/readability
  - unified login right-panel background
  - reduced login submit button font size
- [x] Updated `frontend/src/components/AppLayout.jsx` to accept a dynamic `subtitle` prop.
- [x] Updated `frontend/src/pages/RecordsPage.jsx`, `frontend/src/pages/PaymentFormPage.jsx`, and `frontend/src/pages/PropertyRecordsPage.jsx` to pass context-specific subtitles.
- [x] Added confirmation prompts before save/update actions in `PaymentFormPage.jsx` and `PropertyRecordsPage.jsx`.

## Current Task: Low Priority Accessibility Polish Pass (Completed)
- [x] **Scope**:
  - Deliver low-priority accessibility and UX polish items from the backlog.
  - Keep backend/API/database unchanged.
- [x] **Files Updated**:
  - `frontend/src/styles.css`
  - `frontend/src/components/AppLayout.jsx`
  - `frontend/src/pages/RecordsPage.jsx`
  - `frontend/src/pages/PropertyRecordsPage.jsx`
  - `frontend/index.html`
  - `docs/Plan.md`, `docs/Implementation.md`, `docs/Status.md`
- [x] **Implementation Steps**:
  1. Apply light-mode sidebar visual polish tokens.
  2. Add sticky table header behavior.
  3. Add empty-state CTA blocks.
  4. Add mobile hamburger + off-canvas sidebar interaction.
  5. Add font-loading links in `frontend/index.html`.
  6. Reduce upload modal title size.
  7. Run `npm.cmd run build`.
- [x] **Non-Goals**:
  - No backend/API/schema changes.
  - No route architecture redesign.

## Completion Update: Low Priority Accessibility Polish Pass
- [x] Updated `frontend/src/styles.css` with light-sidebar polish, sticky headers, empty-state styles, mobile sidebar behavior, and upload-title sizing.
- [x] Updated `frontend/src/components/AppLayout.jsx` with hamburger toggle and overlay close behavior.
- [x] Updated `frontend/src/pages/RecordsPage.jsx` and `frontend/src/pages/PropertyRecordsPage.jsx` empty-state sections with CTAs.
- [x] Updated `frontend/index.html` with Google Font preconnect + stylesheet links.

## Current Task (Completed): Bills Edit Prefill Fix
- [x] Files updated:
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `docs/Plan.md`
  - `docs/Implementation.md`
- [x] What changed:
  1. Added module-aware filtering for Bills table rows so each bill tab only shows rows relevant to that bill type.
  2. Prevented cross-module Edit selection from opening forms with only shared/property fields.
  3. Corrected property-context fallback keys for RPT fields:
     - `real_property_tax` now maps from `real_property_tax` (fallback `rent_property_tax`).
     - `rpt_payment_status` now maps from `rpt_payment_status` (fallback `payment_status_rpt`).
  4. Renamed Association label from `Rent Property Tax` to `Real Property Tax` for clarity.
- [x] Verification:
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Bills Save Button + DB Recording Fix
- [x] Files updated:
  - `frontend/src/components/payment/PaymentForm.jsx`
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `docs/Plan.md`
  - `docs/Implementation.md`
- [x] What changed:
  1. Added explicit submit button in Bills form header actions:
     - `Save` in create mode
     - `Update` in edit mode
     - wired via `type=\"submit\" form=\"payment-form\"`.
  2. Disabled Upload/Save buttons while saving/uploading to avoid conflicting actions.
  3. Added clearer save error mapping in `PaymentFormPage.jsx`:
     - Duplicate monthly row now explains to change Billing Period or edit existing row.
     - Missing billing period now gives a direct corrective message.
     - Missing DD/Property now gives a direct corrective message.
  4. Updated backend bill validation in `api/bills.php`:
     - save/update now requires at least one identity value (`DD` or `Property`), not `DD` only.
  4. Kept monthly-row identity rule unchanged:
     - allowed: same `DD/Property` in different `billing_period`
     - blocked: same `DD/Property` in same `billing_period` (must update existing row)
- [x] Verification:
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Billing Period Ownership Shift
- [x] Files updated:
  - `api/bootstrap.php`
  - `api/property.php`
  - `frontend/src/pages/PropertyRecordsPage.jsx`
  - `frontend/src/pages/PaymentFormPage.jsx`
  - `frontend/src/components/payment/PaymentForm.jsx`
  - `frontend/src/styles.css`
  - `frontend/src/pages/__tests__/BillingFlow.integration.test.jsx`
  - `docs/Plan.md`
  - `docs/Implementation.md`
- [x] What changed:
  1. Property Records now includes `billing_period` as a first-class field (`type=\"month\"`) and displays it in list view.
  2. Property API now treats records as monthly:
     - create requires `billing_period`
     - list groups by `dd + property + billing_period`
     - update/delete operate on the selected monthly identity scope.
  3. Shared property upsert helper now syncs/inserts by month scope (`dd + property + billing_period`) instead of broad property-only scope.
  4. Bills UI no longer renders Billing Period calendar input.
  5. Bills flow now reads billing period from selected Property Record/context (or upload payload) and validates presence at save time.
  6. Property selection labels in Bills now include period (e.g., `PropertyName (YYYY-MM)`) to avoid ambiguity when same property has multiple months.
  7. Updated integration tests to reflect the new source of truth for billing period.
  8. Updated Property Records form header helper text to show live `Billing Period` value.
- [x] Verification:
  - [x] `php -l api/property.php`
  - [x] `php -l api/bootstrap.php`
  - [x] `npm.cmd run test -- --run` (in `frontend/`)
  - [x] `npm.cmd run build` (in `frontend/`)

## Approved Next Implementation Wave
Goal: raise maintainability, test coverage, and architecture quality toward a 90+ project score.

- [x] Add automated tests:
  - Backend smoke tests with PHPUnit (auth/session/CSRF + core bill/property endpoints).
  - Frontend component tests with Vitest for critical UI behavior.
- [x] Split `frontend/src/pages/PaymentFormPage.jsx` into sub-components:
  - `Form`
  - `EditModal`
  - `UploadModal`
- [x] Split `api.php` into resource-specific files and route requests through a central dispatcher:
  - e.g. `api/bills.php`, `api/property.php`, `api/auth.php`.
- [x] Replace runtime `ALTER TABLE` checks in request flow with proper versioned SQL migrations.
- [x] Use dynamic user identity in `AppLayout.jsx` from active session (replace hardcoded `Admin` / `AD`).

Recommended order:
1. Tests (safety net before refactor)
2. `PaymentFormPage.jsx` split
3. `api.php` split
4. SQL migrations
5. Dynamic session username/avatar

Definition of done for this wave:
- [x] PHPUnit and Vitest suites run locally and pass.
- [x] Payment flow behavior remains unchanged after component split.
- [x] API behavior remains backward-compatible after router/resource split.
- [x] No runtime schema mutation remains in request handlers.
- [x] Sidebar/header shows live session username and computed initials.

## Current Task (Approved): Phase 1 Test Foundation
Implementation scope:
- [x] Root PHPUnit setup:
  - [x] Add `composer.json` with `phpunit/phpunit` dev dependency.
  - [x] Add `phpunit.xml`.
  - [x] Add `tests/ApiSmokeTest.php` to validate core API availability/guards without requiring DB login.
- [x] Frontend Vitest setup:
  - [x] Add dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
  - [x] Add test config in `frontend/vite.config.js` and setup file.
  - [x] Add smoke tests for `LoginPage`, `AppLayout`, and route guard rendering.
- [x] Scripts:
  - [x] Root: `composer test`.
  - [x] Frontend: `npm run test`.

Planned files:
- `composer.json`
- `phpunit.xml`
- `tests/ApiSmokeTest.php`
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/src/test/setupTests.js`
- `frontend/src/pages/__tests__/LoginPage.test.jsx`
- `frontend/src/components/__tests__/AppLayout.test.jsx`
- `frontend/src/App.test.jsx`

## Current Task (Completed): Add File Introductions
Implementation scope:
- [x] Add concise introductory headers to in-scope source/config files:
  - `.php` files in project root + `setup/` + `tests/`.
  - `.js` and `.jsx` files in `frontend/src/`, `docs/`, and root JS sources.
  - `.xml` files (currently `phpunit.xml`).
- [x] JSON-safe introductions:
  - [x] `composer.json`: add/adjust `description` (valid JSON metadata).
  - [x] `frontend/package.json`: add/adjust `description` (valid JSON metadata).
  - [x] Keep lock files unchanged (`package-lock.json`, `frontend/package-lock.json`).
- [x] Exclusions:
  - `frontend/node_modules/`, `frontend/dist/`, `vendor/`, `tmp/`.
- [x] Style:
  - Keep headers short and consistent.
  - No functional code changes; comments/metadata only.

Planned files (current scope list):
- `api.php`, `db.php`, `index.php`, `login.php`, `logout.php`
- `setup/*.php`
- `tests/ApiSmokeTest.php`
- `script.js`, `docs/n8n_code_parser.js`
- `frontend/src/**/*.js`, `frontend/src/**/*.jsx`
- `frontend/vite.config.js`
- `phpunit.xml`
- `composer.json`, `frontend/package.json`

## Current Task (Approved): iOS + PC Full Compatibility
Implementation scope:
- [ ] Upload input compatibility:
  - [x] Extend backend upload validation for iOS-originating image types where feasible.
  - [x] Keep strict security checks (`is_uploaded_file`, size limit, MIME validation).
- [ ] Upload result correctness:
  - [x] Add frontend guard so success toast appears only when required extracted bill fields are present.
  - [x] Surface explicit error when upload succeeded technically but extracted values are empty.
- [ ] n8n response normalization:
  - [x] Strengthen parser mapping for common iOS and n8n response envelopes.
  - [x] Enforce module-specific required keys before auto-populating form.
  - [x] Added parser support for MORE Electric-style labels:
    - `Customer Acct. No.`
    - `Billing Month`
    - `TOTAL CURRENT BILL AMOUNT`
    - `Current Bill Due Date`
    - `Customer Name` / `Address`
  - [x] Added module-targeted upload remap in frontend parser so electricity tab can recover from misclassified internet-style payload fields.
- [ ] Cross-device resilience:
  - [x] Improve error messaging for timeout/unreachable webhook/invalid payload.
  - [ ] Ensure same behavior for iOS Safari and desktop browsers in upload + save path.

Planned files:
- `frontend/src/pages/PaymentFormPage.jsx`
- `frontend/src/lib/api.js`
- `frontend/src/components/payment/UploadModal.jsx`
- `api/bills.php`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `php -l api\\bills.php`
- [x] `composer test`
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status note:
- [x] LAN route check from host passed for app and session endpoint (`http://192.168.4.101/Finance`).
- [ ] Manual iOS on-device QA is required to close the remaining compatibility checkboxes.

## Current Task (Completed): Approved Wave Step 2 - Split PaymentFormPage
Implementation scope:
- [x] Refactor `frontend/src/pages/PaymentFormPage.jsx` into:
  - [x] `frontend/src/components/payment/PaymentForm.jsx`
  - [x] `frontend/src/components/payment/EditModal.jsx`
  - [x] `frontend/src/components/payment/UploadModal.jsx`
- [x] Keep orchestration/state in `PaymentFormPage.jsx` while moving presentational/UI chunks.
- [x] Preserve existing props/state behavior, unsaved guard, and n8n upload flow.
- [x] No API contract changes in this step.

Planned files:
- `frontend/src/pages/PaymentFormPage.jsx`
- `frontend/src/components/payment/PaymentForm.jsx`
- `frontend/src/components/payment/EditModal.jsx`
- `frontend/src/components/payment/UploadModal.jsx`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Approved Wave Step 3 - Split `api.php`
Implementation scope:
- [x] Extract routing and handlers from `api.php` into modular files:
  - [x] `api/bootstrap.php` (session/bootstrap/shared helpers)
  - [x] `api/auth.php` (csrf/session/login)
  - [x] `api/bills.php` (bill CRUD/upload/list endpoints)
  - [x] `api/property.php` (property record CRUD/list endpoints)
  - [x] `api/router.php` (action dispatch)
- [x] Keep `api.php` as entrypoint wrapper for backward compatibility.
- [x] Keep response payloads, status codes, and action names unchanged.
- [x] No schema redesign in this step.

Planned files:
- `api.php`
- `api/bootstrap.php`
- `api/auth.php`
- `api/bills.php`
- `api/property.php`
- `api/router.php`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `php -l api.php`
- [x] `php -l api\\*.php`
- [x] `composer test`
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Approved): Approved Wave Step 4 - SQL Migrations
Implementation scope:
- [x] Add versioned SQL migrations under `Databases/migrations/` for required `property_billing_records` columns.
- [x] Add migration runner script (`setup/run_migrations.php`) with migration tracking table (`schema_migrations`).
- [x] Remove runtime `ALTER TABLE` mutations from API bootstrap (`api/bootstrap.php`).
- [x] Add non-mutating schema guard so missing columns fail with clear message instead of mutating at request time.
- [x] Keep API route/action contracts unchanged.

Planned files:
- `Databases/create_property_billing_records.sql`
- `Databases/migrations/*.sql`
- `setup/run_migrations.php`
- `setup/setup_property_billing_records.php`
- `api/bootstrap.php`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `php -l api\\bootstrap.php`
- [x] `php -l setup\\run_migrations.php`
- [ ] run `php setup\\run_migrations.php` (blocked: local MySQL connection refused)
- [x] `composer test`
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Approved Wave Step 5 - Dynamic Session Identity
Implementation scope:
- [x] Read active session username from frontend session check response.
- [x] Feed username into `AppLayout` identity panel.
- [x] Compute initials dynamically and remove hardcoded `Admin` / `AD`.
- [x] Keep existing logout and navigation behavior unchanged.

Planned files:
- `frontend/src/lib/auth.js`
- `frontend/src/components/AppLayout.jsx`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Speed Up "Checking Session"
Implementation scope:
- [x] Frontend:
  - [x] Update `frontend/src/lib/auth.js` to add `AbortController` timeout for `checkSession`.
  - [x] Update `frontend/src/App.jsx` protected-route query options for faster guard behavior.
  - [x] Keep auth logic unchanged (only performance/reliability tuning).
- [x] Backend:
  - [x] Update `api.php` session endpoint path to minimize blocking risk for read-only session checks.
- [x] Error UX:
  - [x] Ensure timeout/unreachable cases fail quickly instead of indefinite "Checking session...".

Planned files:
- `frontend/src/lib/auth.js`
- `frontend/src/App.jsx`
- `api.php`
- `docs/Plan.md`, `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] `php -l api.php`

## Current Task (Completed): Suggestions.md Phase 1 Quality Hardening
Implementation scope:
- [x] Add React Error Boundary:
  - [x] Add `frontend/src/components/ErrorBoundary.jsx` with fallback UI and reset behavior.
  - [x] Integrate boundary at app root routing layer in `frontend/src/App.jsx`.
- [x] Remove unused legacy file:
  - [x] Delete root `script.js` after runtime reference audit.
  - [x] Verify no non-doc runtime files reference `script.js`.
- [x] Update product documentation:
  - [x] Rewrite `docs/Features.md` to match current system behavior and stack.

Planned files:
- `frontend/src/components/ErrorBoundary.jsx`
- `frontend/src/App.jsx`
- `script.js` (delete)
- `docs/Features.md`
- `docs/Plan.md`
- `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Suggestions.md Phase 2 Integration Test Coverage
Implementation scope:
- [x] Add a new frontend integration-style test suite for billing flows:
  - [x] Water bill create -> appears in Records.
  - [x] March edit -> February unchanged (month isolation).
- [x] Mock API module with in-memory test store for deterministic flow validation.
- [x] Assert update payload contains month-scoped targeting fields (`target_billing_period`, etc.).

Planned files:
- `frontend/src/pages/__tests__/BillingFlow.integration.test.jsx`
- `docs/Plan.md`
- `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Suggestions.md Phase 3 Live Migration Execution
Implementation scope:
- [x] Patch migration runner for MySQL buffered execution safety.
- [x] Re-run pending migrations against configured DB.
- [x] Verify migration tracking and required billing schema columns.

Planned files:
- `setup/run_migrations.php`
- `docs/Plan.md`
- `docs/Implementation.md`

Validation plan:
- [x] `php -l setup\\run_migrations.php`
- [x] `php setup\\run_migrations.php`
- [x] Verify `schema_migrations` rows + required columns via DB query

## Current Task (Approved): Android + iOS Compatibility Pass
Implementation scope:
- [x] Frontend mobile shell hardening:
  - [x] Add mobile web app metadata in `frontend/index.html`.
  - [x] Add safe-area and dynamic viewport CSS rules in `frontend/src/styles.css`.
- [x] Upload UX hardening for phones:
  - [x] Update `frontend/src/components/payment/UploadModal.jsx` with both:
    - [x] standard file picker
    - [x] camera capture entry point
  - [x] Keep upload callback contract unchanged.
- [x] Backend upload compatibility widening:
  - [x] Expand accepted mobile image MIME/extension handling in `api/bills.php` without weakening security guards.

Planned files:
- `index.php`
- `manifest.webmanifest`
- `frontend/index.html`
- `frontend/public/manifest.webmanifest`
- `frontend/src/styles.css`
- `frontend/src/components/payment/UploadModal.jsx`
- `api/bills.php`
- `docs/Plan.md`
- `docs/Implementation.md`

Validation plan:
- [x] `php -l api\\bills.php`
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Dashboard / KPI Summary Page
Implementation scope:
- [x] Add dashboard page component and KPI calculations from existing records API.
- [x] Add protected `/dashboard` route and make root route redirect there.
- [x] Add Dashboard link in sidebar navigation.
- [x] Keep API contract unchanged (frontend-only feature using existing `fetchBills`).

Planned files:
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/components/AppLayout.jsx`
- `frontend/src/styles.css`
- `frontend/src/App.test.jsx`
- `docs/Plan.md`
- `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): 100% Professionalization Program (Phase 1 Foundation)
Implementation scope (completed in this wave):
- [x] Security baseline:
  - [x] Added strict security/cache headers and auth/write audit logging.
  - [x] Applied login-rate-limit handling in auth flow.
- [x] Server scalability baseline:
  - [x] Added optional server-side filtering + pagination to `action=list`.
  - [x] Wired `RecordsPage` to server-driven `page/per_page/q/bill_type`.
  - [x] Updated CSV export to fetch full filtered dataset on demand.
- [x] Database baseline:
  - [x] Added migration `20260226_003_add_login_attempts_and_billing_indexes.sql`.
  - [x] Added `login_attempts` table and high-value billing indexes.
  - [x] Ran migrations successfully.
- [x] Test baseline:
  - [x] Updated billing integration test mocks to support paginated `fetchBills` response shape.
  - [x] Re-ran frontend test/build matrix.

Files touched in this wave:
- Backend:
  - [x] `api/bills.php`
  - [x] `api/property.php`
- Database:
  - [x] `Databases/migrations/20260226_003_add_login_attempts_and_billing_indexes.sql`
- Frontend:
  - [x] `frontend/src/lib/api.js`
  - [x] `frontend/src/pages/RecordsPage.jsx`
- Tests:
  - [x] `frontend/src/pages/__tests__/BillingFlow.integration.test.jsx`
- Docs:
  - [x] `docs/Plan.md`
  - [x] `docs/Implementation.md`

Validation run:
- [x] `php -l api/bills.php`
- [x] `php -l api/property.php`
- [x] `php -l api/auth.php`
- [x] `php -l api/bootstrap.php`
- [x] `php setup/run_migrations.php`
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [ ] Manual smoke: login, property list CRUD, all 4 bill save/update flows, records edit/export, mobile layout

Status:
- [x] Approved wave implemented.
- [x] Docs synchronized as source of truth.

## Current Task (Completed): Phase 3 Production Excellence (Wave 1 Foundation)
Implementation scope:
- [x] CI workflow:
  - [x] Add `.github/workflows/ci.yml` to run backend + frontend quality gates.
  - [x] Include PHP setup (`composer install`, `composer test`) and frontend setup (`npm ci`, `npm run test`, `npm run build`).
- [x] Health monitoring endpoint:
  - [x] Add public `action=health` response in API auth/public actions.
  - [x] Return timestamp, app status, and DB connectivity check result.
- [x] Governance docs:
  - [x] Add `docs/CHANGELOG.md` (baseline structure + current release entry).
  - [x] Add `docs/ReleaseChecklist.md` (repeatable release checklist).
  - [x] Add `docs/IncidentRunbook.md` (incident triage and recovery steps).

Planned files:
- [x] `.github/workflows/ci.yml`
- [x] `api/auth.php`
- [x] `docs/CHANGELOG.md`
- [x] `docs/ReleaseChecklist.md`
- [x] `docs/IncidentRunbook.md`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php -l api/auth.php`
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): Phase 3 Production Excellence (Wave 2 RBAC + Permission Tests)
Implementation scope:
- [x] Database:
  - [x] Add migration for `users.role` column and default role backfill.
- [x] API auth:
  - [x] Add role normalization helper and include role in session response.
  - [x] Add action-to-role permission map in authenticated request guard.
  - [x] Return `403 Forbidden` JSON for disallowed actions.
- [x] Tests:
  - [x] Add backend tests validating `viewer`/`editor`/`admin` action access.
  - [x] Keep existing API smoke tests and frontend suites passing.

Planned files:
- [x] `Databases/migrations/20260226_004_add_user_roles.sql`
- [x] `Databases/create_users_table.sql`
- [x] `setup/setup_users.php`
- [x] `api/auth.php`
- [x] `tests/AuthRbacTest.php`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php -l api/auth.php`
- [x] `php -l tests/AuthRbacTest.php`
- [x] `php setup/run_migrations.php`
- [x] `composer test`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

## Current Task (Completed): UX + Functionality First (Security Deferred by Request)
Implementation scope:
- [x] Frontend workflow improvements:
  - [x] Refine `PaymentFormPage` flow to reduce friction and repetitive input.
  - [x] Improve `RecordsPage` discoverability for search/edit/export actions.
  - [x] Improve `PropertyRecordsPage` usability for create/edit/delete clarity.
- [x] UI polish for readability and friendliness:
  - [x] Better form sectioning and field grouping in bill forms.
  - [x] Better table readability and column/value formatting.
  - [ ] Better empty states and guidance CTAs.
- [x] Behavior improvements:
  - [x] Stronger inline validation + clearer error/help text.
  - [ ] Better success/failure feedback and save-state indicators.
  - [x] Sticky selected context where it helps user speed.

Planned files:
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `frontend/src/pages/RecordsPage.jsx`
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/components/payment/PaymentForm.jsx`
- [x] `frontend/src/styles.css`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [ ] Manual UX smoke for daily workflows:
  - [ ] create property -> create bill -> edit bill -> view records -> export
  - [ ] same flows on mobile layout

Status:
- [x] Approved and implemented.

## Current Task (Completed): Remove Bills Helper Strip
Implementation scope:
- [x] Remove helper text (`Select a Property first... Ctrl + S`) from Bills header.
- [x] Remove Bills stepper buttons row (`WiFi/Internet`, `Water`, `Electricity`, `Association`) from Bills UI.
- [x] Keep keyboard save shortcut and navigation behavior working in background logic.

Planned files:
- [x] `frontend/src/components/payment/PaymentForm.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx` (unused props cleanup completed)
- [x] `frontend/src/styles.css` (no removal; stepper styles retained because Records page uses them)
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Approved and implemented.

## Current Task (Completed): Move Association/RPT/Penalty Fields To Property Records
Implementation scope:
- [x] Backend/schema:
  - [x] Add these columns to `property_list` via migration:
    - [x] `association_payment_status`
    - [x] `real_property_tax`
    - [x] `rpt_payment_status`
    - [x] `penalty`
  - [x] Update property master normalization/select/upsert/sync helpers to include the new columns.
  - [x] Ensure bill list hydration uses Property List values for those fields when linked by `property_list_id`.
- [x] Frontend:
  - [x] Add new fields to Property Records form and table with clearer labels.
  - [x] Remove these four inputs from Bills Association form.
  - [x] Keep Bills state/context auto-filled from selected Property Records.
  - [x] Update Records labels to clearer wording where these columns appear.
- [x] Documentation sync:
  - [x] Keep `docs/Plan.md` and `docs/Implementation.md` aligned.

Planned files:
- [x] `Databases/create_property_list.sql`
- [x] `Databases/migrations/20260226_005_add_property_list_financial_status_fields.sql` (new)
- [x] `api/bootstrap.php`
- [x] `api/property.php`
- [x] `api/bills.php`
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `frontend/src/pages/RecordsPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php -l api/bootstrap.php`
- [x] `php -l api/property.php`
- [x] `php -l api/bills.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] `php setup/run_migrations.php`

Status:
- [x] Approved and implemented.

## Current Task (Completed): Bills Create DB Error Hotfix
Implementation scope:
- [x] Diagnose save failure using Apache/PHP logs.
- [x] Fix `api/bills.php` create insert SQL so placeholder count matches bound values.
- [x] Verify no syntax issues and validate execution path with DB smoke check.

Planned files:
- [x] `api/bills.php`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php -l api/bills.php`
- [x] SQL insert smoke check via PDO (post-fix)

Status:
- [x] Implemented.

## Current Task (Completed): Monthly Property Records With Billing Period
Implementation scope:
- [x] Database/model:
  - [x] Add `billing_period` (`YYYY-MM`) column to `property_list`.
  - [x] Change property unique identity from `dd + property` to `dd + property + billing_period`.
- [x] Backend API:
  - [x] Update property payload normalization/select/create/update/conflict checks to include `billing_period`.
  - [x] Ensure bill-side property hydration reads month-aware Property Records.
- [x] Frontend:
  - [x] Add `Billing Period` input to Property Records form and table.
  - [x] Require month selection when saving/updating Property Records.
  - [x] Keep Bills form without Billing Period input.
  - [x] Make Bills Property selector labels include month to avoid ambiguity.
- [x] Documentation sync:
  - [x] Keep `docs/Plan.md` and `docs/Implementation.md` updated.

Planned files:
- [x] `Databases/create_property_list.sql`
- [x] `Databases/migrations/20260226_006_add_property_list_billing_period_identity.sql` (new)
- [x] `api/bootstrap.php`
- [x] `api/property.php`
- [x] `api/bills.php`
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `frontend/src/lib/api.js`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php setup/run_migrations.php`
- [x] `php -l api/bootstrap.php`
- [x] `php -l api/property.php`
- [x] `php -l api/bills.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)
- [x] DB uniqueness smoke check for period-aware identity

Status:
- [x] Approved and implemented.

## Current Task (Completed): Move Billing Period To Header And Keep Visible Across Bill Tabs
Implementation scope:
- [x] Property Records UI:
  - [x] Removed helper text (`Fill DD or Property and Billing Period to save...`).
  - [x] Added `Billing Period` month input in Property Records header area.
  - [x] Kept table/search columns unchanged while removing duplicate form-field rendering for `billing_period`.
- [x] Bills UI:
  - [x] Added `Billing Period` month input in Bills header next to Property/DD combobox.
  - [x] Updated header field layout styles for desktop/mobile.
- [x] Bills state persistence:
  - [x] Persisted `billing_period` at top-level in shared bill selection context.
  - [x] Restored `billing_period` from selection context on tab/page reload.
  - [x] Prevented stale property-context override by prioritizing selection/draft `billing_period`.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/components/payment/PaymentForm.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `frontend/src/styles.css`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Align Bills Header Layout
Implementation scope:
- [x] Update Bills header markup to place helper hint on its own line under header inputs.
- [x] Refactor Bills header layout CSS to a stable two-column grid (`left controls`, `right actions`).
- [x] Align `Property / DD` and `Billing Period` fields in one row and keep responsive mobile stacking.

Planned files:
- [x] `frontend/src/components/payment/PaymentForm.jsx`
- [x] `frontend/src/styles.css`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Show Billing Period In Bills Only
Implementation scope:
- [x] Property Records frontend:
  - [x] Removed `Billing Period` field from visible Property Records form fields.
  - [x] Removed Property Records header month input.
  - [x] Updated required-field messaging to `DD or Property` only.
- [x] Property Records backend:
  - [x] Removed strict `billing_period` required validation in create/update.
  - [x] Updated duplicate/conflict messages to generic property wording.
- [x] Bills frontend:
  - [x] Kept `Billing Period` input visible in Bills header.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `api/property.php`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `php -l api/property.php`
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Default Empty Property Records Form
Implementation scope:
- [x] Removed draft/session context rehydration path in Property Records create-mode loader.
- [x] Kept Records edit-context override behavior (`finance:records-edit-context`) unchanged.
- [x] Reset Property Records form/baseline/selection to `INITIAL_FORM` when opening form route.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Preserve Unsaved Property Records State Across Tabs
Implementation scope:
- [x] Re-enabled Property Records draft restore from `finance:property-record-draft` on form route load.
- [x] Kept fallback hydration from shared bill selection context when no draft is present.
- [x] Kept reset behavior tied to explicit actions (`Save`/`Cancel`) instead of route/tab switches.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Bills Direct Access Must Start Empty
Implementation scope:
- [x] Property Records:
  - [x] Updated `Next` navigation to include route state `{ fromPropertyRecordsNext: true }`.
- [x] Bills:
  - [x] Added direct-access guard: if not from Property Records `Next` and no records edit context, clear draft/selection context and reset to empty form.
  - [x] Preserved route state during internal Bills navigation (Next, list/form toggles) so flow prefill remains available.
  - [x] Kept records edit-context hydration unchanged.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Fix Property/Bills Navigation Persistence Flow
Implementation scope:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
  - [x] Simplified form-route hydration: restore only local Property Records draft; otherwise initialize empty create form.
  - [x] Removed shared Bills selection fallback prefill from default Property Records flow.
  - [x] Stopped clearing Bills per-tab draft keys during `Next` navigation.
- [x] `frontend/src/pages/PaymentFormPage.jsx`
  - [x] Softened direct-access reset logic: only force empty baseline when no existing draft/selection/context exists.
  - [x] Continuous shared-state persistence now tracks full `form` object + combo search, not just property identity fields.
  - [x] Preserves entered bill values across tab/route navigation until explicit Save/Clear.

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Restore Bills-to-PropertyRecords Autofill
Implementation scope:
- [x] Updated Property Records form loader to read Bills context keys:
  - [x] `finance:selected-property-record`
  - [x] `finance-bill-selection:shared` (including nested `form`)
- [x] Added context identity guard (`property_list_id` or `dd` or `property`) before applying prefill.
- [x] Preserved precedence:
  - [x] local Property Records draft
  - [x] Bills selection context
  - [x] empty default create form

Planned files:
- [x] `frontend/src/pages/PropertyRecordsPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): One Row Per Property In Records
Implementation scope:
- [x] API client:
  - [x] Added `fetchMergedBills()` using `action=list_merged`.
- [x] Records page:
  - [x] Replaced paged server list query with merged dataset query.
  - [x] Added client-side bill-view filter/search over merged rows.
  - [x] Added client-side pagination over filtered merged rows.
  - [x] Updated CSV export to use merged + current filters.

Planned files:
- [x] `frontend/src/lib/api.js`
- [x] `frontend/src/pages/RecordsPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.

## Current Task (Completed): Make Property Records Independent From Bills Draft Data
Implementation scope:
- [x] `frontend/src/pages/PaymentFormPage.jsx`
  - [x] Updated Property-context hydration logic to honor `fromPropertyRecordsNext` as a fresh-flow signal.
  - [x] When fresh-flow is active, ignore stale `billSelection` form payload and use context-selected property identity.
  - [x] Initialize next Bills form with `buildClearedFormForBillType(activeBillType)` so old bill values are not reused.
  - [x] Simplified property option labels to `Property/DD` without billing-period suffix.

Planned files:
- [x] `frontend/src/pages/PaymentFormPage.jsx`
- [x] `docs/Plan.md`
- [x] `docs/Implementation.md`

Validation plan:
- [x] `npm.cmd run test -- --run` (in `frontend/`)
- [x] `npm.cmd run build` (in `frontend/`)

Status:
- [x] Implemented.
