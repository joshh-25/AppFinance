# Finance App Features

_Last updated: 2026-03-11_

## 1. Application Overview

A single-operator web app for managing monthly property billing, OCR-assisted bill intake, review, and records tracking.

**Architecture summary:**
- **Frontend:** React 18 SPA with React Router v6, TanStack Query v5, and Vite 5.
- **Backend:** PHP 8 API with session auth, CSRF protection, role-aware access checks, and local-only hardening.
- **Database:** MySQL with versioned migrations and backend-persisted review queue state.
- **OCR flow:** bill uploads are sent to an n8n webhook pipeline running locally through Docker.

## 2. Frontend Features

### Application Shell
- Responsive sidebar layout with mobile navigation behavior.
- Theme toggle with persisted preference.
- Error boundary protection around page content.
- Toast feedback for save, upload, retry, and failure states.
- Runtime-config-driven base paths instead of hardcoded `/Finance` routes.

### Authentication
- Username/password login with session verification on load.
- Protected routes with redirect-on-expired-session behavior.
- CSRF-protected logout flow through the backend API.
- Sidebar identity display with current username.

### Property Records
- Create, edit, delete, search, and paginate property master records.
- Read-only behavior for restricted users.
- Safe bill-to-property handoff using the correct property record identity.

### Bills Entry
- Shared billing form kernel across Water, WiFi/Internet, Electricity, and Association.
- Monthly due-period handling with cross-screen edit context.
- OCR-assisted upload modal for bill extraction and prefill.
- Account lookup support and property context carryover between screens.
- Global edit-state guards for cross-page billing flows.

### Bills Review
- Backend-persisted review queue per signed-in operator.
- Retry, requeue, save, and remove flows for OCR rows.
- Mixed-invoice handling, including association bills with water line items.
- Compact desktop rows and phone-friendly review cards.
- OCR health feedback and queue sync recovery messaging.

### Records and Dashboard
- Merged monthly records view with server-side pagination, filtering, and CSV export.
- Cross-screen edit navigation from Records into billing/property forms.
- Dashboard summary endpoint for lighter refresh behavior.
- Review queue counts sourced from backend state instead of browser-local storage.

## 3. Backend Features

### Bills API
- CRUD for utility bill rows.
- Merged records listing and paginated monthly record queries.
- OCR upload forwarding with defensive validation and upload error handling.
- Lightweight dashboard summary aggregation.
- Backend review queue persistence.

### Property API
- Property master CRUD, search, and pagination.
- Property account directory lookup for OCR-assisted matching.

### Auth and Safety
- Session auth with login/logout lifecycle.
- RBAC enforcement aligned with frontend visibility/read-only behavior.
- CSRF coverage for write actions and logout.
- Local-only CSP/HSTS-aware runtime and stricter session bootstrap.
- Login rate limiting and upload request validation.

## 4. Data and Workflow Notes

- `property_billing_records` stores utility rows by property and due period.
- `property_list` remains the property master source.
- Bills Review queue state is stored in the backend, not `localStorage`.
- OCR/n8n is expected to be reachable locally through `N8N_WEBHOOK_URL`.

## 5. Current Quality Signals

### Frontend
- `11` test files
- `72` tests passing
- Direct unit coverage now exists for:
  - OCR parsing
  - account lookup parsing
  - workflow state persistence
  - bill form state helpers
  - bill review helper logic
- Integration coverage exists for:
  - cross-screen billing flows
  - Bill Review queue persistence and recovery
  - role-aware records behavior
  - route/session behavior

### Backend
- PHPUnit suite passing in local verification.
- Smoke, RBAC, validation, property, and review queue coverage remains active.

## 6. Current Product Status

- **App state:** `Production Ready` for the intended local-only setup
- **Good for:** real daily local use by one signed-in operator
- **Still out of scope for this verdict:** public-hosted deployment, app-store packaging, and multi-user operation

## 7. Recent Phase 23 Maintainability Changes

- Billing/property workflow storage is centralized in a shared helper.
- `PaymentFormPage.jsx` and `BillReviewPage.jsx` now delegate pure logic to focused feature-local helper modules.
- Stale product and release docs are synced with the current app behavior and test inventory.
