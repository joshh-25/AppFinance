# Finance App Features

## 1. Application Overview
- Single finance web app for property billing workflows.
- React SPA frontend served by PHP entrypoint (`index.php`) with Vite build assets.
- Main functional areas:
  - Property Records
  - Bills (WiFi, Water, Electricity, Association)
  - Merged Records view and export

## 2. Frontend Features (React)

### Core UI/UX
- Responsive app shell with sidebar navigation and mobile hamburger menu.
- Light/dark theme toggle.
- Toast-based feedback for save/update/upload actions.
- Unsaved-change guards on key editing flows.

### Authentication UX
- Login page with session-based route protection.
- Fast session check path with timeout handling.
- Sidebar user panel shows dynamic username and computed initials.

### Property Records
- Create, edit, list, and delete property master data.
- Search and pagination in list mode.
- Bills-to-Property prefill context support.

### Bills Modules
- Dedicated flows for:
  - WiFi (`internet`)
  - Water
  - Electricity
  - Association dues
- Shared monthly billing period handling.
- Create/update mode with row-scoped edit identity.
- Upload modal for OCR-assisted field auto-population.

### Records
- Merged records table across bill modules.
- Search, pagination, and export support.
- Row-selection driven edit flow with strict identity context.

## 3. Backend Features (PHP API)
- API entrypoint: `api.php` with modular handlers:
  - `backend/src/Modules/Auth/LegacyAuth.php`
  - `backend/src/Modules/Bills/LegacyBills.php`
  - `backend/src/Modules/Property/LegacyProperty.php`
  - `backend/src/Core/ApiRouter.php`
  - shared helpers in `backend/src/Core/LegacyBootstrap.php`
- Session auth endpoints:
  - `action=login`
  - `action=session`
  - `action=csrf`
- CSRF protection enforced for write actions.
- Bill CRUD/list/upload endpoints and property record CRUD/list endpoints.
- n8n webhook integration for bill document processing.
- Upload validation includes file size/type checks and iOS image format handling (HEIC/HEIF support path).

## 4. Data and Migrations
- Primary working table: `property_billing_records`.
- Monthly row model for records (`dd + property + billing_period` identity rules in app logic).
- Versioned SQL migrations in `backend/database/migrations`.
- Migration runner: `backend/tools/run_migrations.php`.
- Runtime request path no longer performs schema mutation.

## 5. Testing and Quality
- Frontend tests: Vitest + React Testing Library.
- Backend tests: PHPUnit API smoke tests.
- Production frontend build via Vite.
- Composer and npm dependency audits available in workflow.

## 6. Technology Stack
- Frontend: React, React Router, TanStack Query, Vite.
- Backend: PHP (modular plain PHP API).
- Database: MySQL.
- OCR/Automation integration: n8n webhook pipeline.
