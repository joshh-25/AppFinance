# Project Phases

## Phase 0: Workflow Foundation (Completed)
- Documentation workflow initialized (`Plan.md`, `Implementation.md`, `rule.md`).
- Feature inventory and implementation tracking established.

## Phase 1: Core Billing Foundation (Completed)
- Refactor from journal-entry flow to utility billing flow.
- Electricity billing table/API/UI introduced.
- Base form + records listing operational.

## Phase 2: Data Model Expansion (Completed)
- Added `property_name` and `or_number` support.
- Expanded schema and UI mapping for richer bill records.

## Phase 3: Multi-Module Billing (Completed)
- Added Water and WiFi bill modules.
- Unified routing via `bill_type` in frontend and backend.

## Phase 4: UX and Navigation Refinement (Completed)
- Sidebar/navigation simplification.
- Record/form switching and transition improvements.
- KPI/table readability enhancements.

## Phase 5: Authentication and Security (Completed)
- Session-based login/logout.
- Protected dashboard and API access.

## Phase 6: UI Redesign and Accessibility (Completed)
- Theme system (dark/light), OLED styling direction.
- Senior-friendly typography, contrast, and interaction updates.
- Toasts, empty states, and visibility refinements.

## Phase 7: Productivity Features (Completed)
- Search and month filter on records.
- Pagination for records table.
- CSV export for filtered history.
- Terminology updates (Property Owner label changes).

## Phase 8: Stabilization and Bug Fixes (Completed)
- Database credential and schema cleanup fixes.
- Record-payment flow reliability fixes.
- Sidebar/logout usability and styling fixes.

## Phase 9: React Adoption Planning (Completed)
- Created `docs/React.md` with stack recommendation and migration strategy.

## Phase 10: React Migration - Read-Only Records (Completed)
- Bootstrapped `frontend/` with Vite + React.
- Built read-only records page against existing PHP API.
- Kept existing PHP frontend functional during migration.

## Phase 11: React Migration - Login + Dashboard Shell (Completed)
- Added React login/dashboard route shells with protected routing.
- Established shared app layout/navigation.

## Phase 12: React Migration - Payment Form (Completed)
- Migrated payment form UI to React.
- Implemented create-payment flow (`api.php?action=add`).
- Added bill-type-aware field mapping and totals behavior.

## Phase 13: React Migration - Upload + Toast Flow (Completed)
- Migrated upload flow to React payment page.
- Auto-populated form from upload parsing.
- Added React toast notifications for upload/save outcomes.

## Phase 14: React Migration - Final Cutover (Completed)
- Reached parity for records features (search/filter/pagination/export).
- Set React as default UI entry under `/Finance`.
- Added SPA rewrite support; preserved PHP auth/API backend.

## Phase 15: React Theme System (Completed)
- Implemented dark/light theme toggle in React.
- Persisted preference via `localStorage` with system fallback.
- Applied theme tokens across layout/pages/components.

## Phase 16: React UI/UX Polish + Login Parity (Completed)
- Polished sidebar/header/cards/forms/tables.
- Added icon-based theme toggle.
- Matched React login visuals to approved PHP reference style.

## Phase 17: React-Only Auth Hardening (Completed)
- Added dedicated PHP auth endpoints (`session`, `login`) for React.
- Decoupled session checks from data-list query dependency.
- Disabled legacy PHP login screen rendering.

## Phase 18: Sidebar/Layout Refinement Series (Completed)
- Active-state contrast fixes and light-mode sidebar parity updates.
- Removed sticky behaviors where requested.
- Locked sidebar layout and normalized height/scroll behavior.

## Phase 19: CSV-Exact Records Contract Migration (Completed)
- Introduced CSV-aligned storage model (`property_billing_records`).
- Updated backend add/list logic and frontend form/table/export mapping.
- Preserved auth/session/upload endpoints.

## Phase 20: 4-Bill Separation + Merged Export Logic (Completed)
- Separated bill domains: `water`, `internet`, `electricity`, `association_dues`.
- Implemented merged grouping by `DD + Property` with `DD` fallback.
- Added deterministic duplicate handling (latest wins).

## Phase 21: Sidebar Bill Views and Manual Entry Modes (Completed)
- Added bill-mode sidebar navigation (`Water`, `Electricity`, `WiFi`, `Association`).
- Shifted from table-only filtering to module-specific manual input behavior.
- Removed `All Bills` button and visible `Bill Type` form field.

## Phase 22: Sidebar Module Cleanup (Completed)
- Removed `Record Payment` module link from sidebar.
- Kept `Records` and bill buttons behavior intact.

## Phase 23: Property Records CRUD Module (Completed)
- Added `Property Records` page, route, and sidebar link.
- Implemented Create/Read/Update flow with edit mode (`selectedId`).
- Added PHP endpoints and SQL table support for property records.

## Phase 24: Property Records Panel UX (Completed)
- Converted Property Records to a single panel that switches form/table modes.
- Kept `Save`, `Update`, `View Record` buttons inside the same form panel.
- Added in-panel table search and per-row edit return-to-form behavior.

## Phase 25: Scrollbar Visibility Controls (Completed)
- Hid sidebar/main scrollbar visuals while preserving scrolling.
- Applied cross-browser scrollbar rules.

## Phase 26: Module-Specific Combobox and Field Rendering (Completed)
- Added searchable Property/DD combobox in Water mode, then extended to all bill modules.
- Applied fallback label logic: `property` first, else `dd`.
- Enforced module-only field rendering (hide unrelated fields).

## Phase 27: Property-to-Bill Data Mapping (Completed)
- Connected Property Records metadata into bill form state on combobox selection.
- Mapped:
  - `rent_property_tax -> real_property_tax`
  - `payment_status_rpt -> rpt_payment_status`
- Ensured records columns populate after bill save.

## Phase 28: Property Records in Merged Records Output (Completed)
- Enhanced `list_merged` to enrich missing bill metadata from `property_records`.
- Added property-only rows so Property Records appear even without bill entries.
- Preserved frontend Records contract and merged export format.

## Phase 29: Records Page Layout Rework (Completed)
- Removed top KPI strip from Records page.
- Expanded DataGrid/table card to fill remaining content height.
- Kept internal table scrolling and anchored pagination.

## Phase 30: Export Reliability for Excel (Planned)
- Fix date/number formatting issues in exported CSV when opened in Excel (e.g., `####`, scientific notation).
- Ensure export action always triggers direct CSV download.
- Keep existing Records merge/data logic unchanged.
