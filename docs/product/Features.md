# Finance App Features

_Last updated: 2026-03-02_

## 1. Application Overview

A single-page web application for managing property billing workflows inside a residential complex. The app handles monthly bill entry, record merging, document uploads, and property master data management.

**Architecture summary:**
- **Frontend:** React 18 SPA (React Router v6, TanStack Query v5), bundled with Vite 5, served as static assets by an Apache/PHP entrypoint (`index.php`).
- **Backend:** Modular PHP 8 REST API (`api.php`), session-authenticated, with CSRF and rate-limit protection.
- **Database:** MySQL via single-connection singleton (`Database.php`), versioned SQL migrations.

---

## 2. Frontend Features (React + Vite)

### Application Shell
- Responsive sidebar navigation with mobile hamburger menu.
- Light / dark theme toggle (persisted across sessions).
- **React Error Boundary** around all page content — prevents full white-screen crashes on runtime errors; shows a recovery UI while keeping the navigation intact.
- Toast notifications for save, update, upload, and error feedback.

### Authentication
- Login page with username/password form and "keep me logged in" checkbox.
- Client-side session guard (`ProtectedRoute`) powered by TanStack Query — redirects unauthenticated users automatically.
- Fast session check with 3.5-second abort timeout (`checkSession` in `shared/lib/auth.js`).
- Sidebar displays dynamic username and computed initials.

### Property Records Module
- Full CRUD (create, edit, list, delete) for property master data.
- Server-side search with pagination.
- "Back to Bills" prefill context: pressing Edit from a bill row pre-populates the property form.

### Bills Modules (Water / WiFi / Electricity / Association)
- Four dedicated bill entry pages sharing a single `PaymentFormPage` kernel.
- Monthly billing period (YYYY-MM) selection with billing context isolation — edits to one period never overwrite a different month's record (verified by integration tests).
- Create / update mode driven by row-scoped edit identity stored in `sessionStorage`.
- Upload modal for OCR-assisted field auto-population via n8n webhook pipeline.
- Field normalization at the API layer (`normalize_bill_type_filter`, `get_bill_type_module_fields`).

### Records (Merged View)
- Merged records table — one row per property per billing period, combining all bill types.
- Full-text search across all visible fields.
- Pagination with configurable page size.
- CSV export of filtered results.
- Row-selection → Edit flow with strict identity context (DD + Property + billing_period + bill ID).

### Frontend Code Structure
```
frontend/src/
├── app/            ← Router entry point (App.jsx, main.jsx)
├── features/       ← Page components (auth, bills, dashboard, property)
│   ├── auth/
│   ├── bills/      ← PaymentFormPage, RecordsPage, bill stubs
│   ├── dashboard/
│   └── property/
└── shared/         ← Reusable utilities
    ├── components/ ← AppLayout, ErrorBoundary, Toast, ConfirmDialog…
    ├── hooks/      ← useToast, useUnsavedChangesGuard
    └── lib/        ← api.js, auth.js, globalEditMode.js
```

---

## 3. Backend Features (PHP 8 API)

### Module Layout
```
backend/src/
├── Core/
│   ├── ApiRouter.php        ← Action dispatcher
│   ├── Database.php         ← Singleton DB connection, config loader
│   └── LegacyBootstrap.php ← Shared input normalizers, rate limiter, CSRF
└── Modules/
    ├── Auth/LegacyAuth.php      ← Login, session, logout
    ├── Bills/LegacyBills.php    ← Bill CRUD, list, merge, upload
    └── Property/LegacyProperty.php ← Property record CRUD/list
```

### Security
- **CSRF tokens** — required for all write actions (`action=add`, `bill_update`, `property_record_*`).
- **Rate limiting** — per-IP window on login endpoint.
- **Session regeneration** on login to prevent fixation.
- **Role-Based Access Control (RBAC)** — `normalize_user_role`, `can_role_access_action` matrix (verified by unit tests).

### API Actions
| Action | Method | Description |
|--------|--------|-------------|
| `session` | GET | Check current session, return username |
| `csrf` | GET | Issue a new CSRF token |
| `login` / `logout` | POST | Auth lifecycle |
| `list` | GET | Paginated bill list (filterable) |
| `list_merged` | GET | Merged bill rows per property |
| `add` | POST | Create a new bill record |
| `bill_update` | POST | Update one bill (ID-scoped) |
| `upload_bill` | POST | Upload a PDF/image for OCR |
| `property_record_list/create/update/delete` | GET/POST | Property master CRUD |

### n8n Integration
- Uploaded bill documents are forwarded to an n8n webhook (`N8N_WEBHOOK_URL`).
- n8n pipeline performs OCR, extracts fields, and returns structured JSON for auto-population.
- Supports iOS HEIC/HEIF image format conversion path.

---

## 4. Data Model

- **Primary table:** `property_billing_records` — one row per bill per billing period.
- **Identity rule:** (DD + Property + billing_period) uniquely identifies a monthly record for a given utility type.
- **Property master:** `property_list` table — source of DD + property name lookups.
- **Versioned migrations:** SQL files in `backend/database/migrations/`, executed by `backend/tools/run_migrations.php`.

---

## 5. Testing & Quality

### Frontend Tests (Vitest + React Testing Library)
| File | Tests | Coverage |
|------|-------|----------|
| `BillingFlow.integration.test.jsx` | 7 | Create/update water, wifi, electricity, association bills; cross-month edit isolation |
| `App.test.jsx` | 3 | Route guard — unauthenticated redirect, authenticated access, root redirect |
| `LoginPage.test.jsx` | 1 | Login form renders correctly |
| **Total** | **11** | **All pass ✅** |

### Backend Tests (PHPUnit 11)
| File | Tests | Coverage |
|------|-------|----------|
| `ApiSmokeTest.php` | 5 | Session, CSRF, login rejection, auth guard for write actions |
| `AuthRbacTest.php` | 22 | Role normalization, required-role matrix, RBAC action access |
| `BillsValidationTest.php` | 11 | Bill type normalization, module field lists, LIKE escaping |
| `PropertyRecordTest.php` | 10 | Positive int sanitization, billing period parsing, payload normalization |
| **Total** | **43** | **103 assertions, all pass ✅** |

---

## 6. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 18 |
| Routing | React Router | 6 |
| Data fetching | TanStack Query | 5 |
| Build tool | Vite | 5 |
| Frontend tests | Vitest + React Testing Library | 2.x |
| Backend language | PHP | 8.2 |
| Backend tests | PHPUnit | 11 |
| Database | MySQL | 8+ |
| Web server | Apache (XAMPP) | 2.4 |
| OCR/Automation | n8n webhook pipeline | — |
| Version control | Git → GitHub | — |

---

## 7. Known Architecture Decisions

- **No ORM** — queries are hand-written SQL with prepared statements to keep the footprint small.
- **No framework router** — `ApiRouter` dispatches on `?action=` query parameter for simplicity.
- **Barrel-free imports** — after the dead-code cleanup (2026-03-02), all imports use canonical `features/` and `shared/` paths. No legacy `src/pages/` or `src/components/` re-exports remain.
- **Error boundary** — wraps only page content, not the navigation shell, so the sidebar remains usable during page-level errors.
