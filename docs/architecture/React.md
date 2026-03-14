# React Integration Guide

## Goal
Adopt React for the frontend while keeping the existing PHP + MySQL backend (`api.php`, `login.php`, `db.php`) stable.

## Recommended Stack
- React 18 + Vite
- React Router (page/module routing)
- TanStack Query (API fetch, caching, refetch)
- Tailwind CSS (keep current design system direction)
- React Hook Form + Zod (form handling and validation)

## Why This Fits Your Project
- Low-risk migration: backend endpoints stay unchanged.
- Faster UI scaling: component-based structure replaces large `index.php` + `script.js` coupling.
- Better maintainability: reusable modules for Electricity, Water, and WiFi.
- Easier testing: frontend logic can be tested independently.

## Proposed Structure
```text
Finance/
  api.php
  login.php
  logout.php
  db.php
  frontend/
    src/
      app/
      pages/
        LoginPage.jsx
        DashboardPage.jsx
      features/
        bills/
          components/
          api/
          hooks/
      shared/
        components/
        lib/
      main.jsx
```

## API Integration Pattern
- Keep existing endpoints:
  - `POST api.php?action=add`
  - `GET api.php?action=list&bill_type={electricity|water|wifi}`
  - `POST api.php?action=upload_bill`
- Use `credentials: 'same-origin'` in frontend requests for session auth.
- Keep backend field names (e.g., `tenant_name`) for compatibility.

## Migration Strategy (Phased)
1. Bootstrap React app in `frontend/` (no backend rewrite).
2. Build Login and Dashboard shell in React.
3. Migrate records table (fetch/filter/pagination/export).
4. Migrate payment form + bill type switching.
5. Migrate upload flow (`upload_bill`) and toasts.
6. Switch default UI entry to React once parity is verified.

## Benefits
- Cleaner code organization with reusable components.
- Faster future features (new bill modules, reports, analytics).
- Improved frontend developer experience (hot reload, modular state, clear boundaries).
- Safer iterative rollout without breaking existing PHP APIs.

## Constraints / Tradeoffs
- Temporary dual-frontend period (PHP views + React) during migration.
- Requires CORS/session configuration awareness if served from different origin.
- Team must align on frontend conventions (state, API layer, component standards).

## Immediate Next Step
Create `frontend/` with Vite + React and wire one read-only records screen first.
