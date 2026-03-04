# Phase 3 QA Report (March 4, 2026)

## Summary (Non-Programmer Friendly)
- We tested the most important system flows again after the latest fixes.
- Core pages, bills records access, and expenses save/update/delete are working in live local testing.
- Security checks (login role rules and CSRF protection) are also working.

## Scope Covered
- Local server route availability
- Live API authentication/session
- Expenses validation + CRUD
- Bills add validation behavior
- Merged records endpoint
- CSRF protection on write actions
- RBAC permission checks (`admin` vs `viewer`)
- Regression test/build suites

## Environment
- Date: March 4, 2026
- Base URL: `http://localhost/Finance`
- API URL: `http://localhost/Finance/api.php`

## Results
1. Route accessibility
- `/`, `/dashboard`, `/records`, `/records/bills`, `/records/expenses`, `/billings`, `/bills/wifi`, `/bills/review`, `/expenses`
- Result: all returned HTTP 200

2. Auth/session and health
- Login with `admin` succeeded
- Session returned `authenticated: true`, `role: admin`
- Health endpoint returned `status: ok`, `database.connected: true`

3. Expenses module (live API)
- Invalid create (blank amount) returned: `Amount is required.`
- Valid create succeeded
- Update succeeded
- Search/list returned the created record
- Delete succeeded

4. Bills module validation
- `add` action with `{}` now returns business validation: `Select a Property from Property List before saving.`
- This confirms JSON payload handling fix is active

5. Security controls
- Write request without CSRF token rejected: `Invalid or missing CSRF token.`
- Temporary `viewer` account test:
  - `list_merged` allowed
  - `expense_create` blocked: `Forbidden`

6. Automated regression checks
- Backend: `php vendor/bin/phpunit -c phpunit.xml` passed
- Frontend: `npm.cmd run test -- --run` passed
- Frontend build: `npm.cmd run build` passed

## Issues Found During This Pass
- No new blocking defects found in covered scope.

## Remaining Manual Sign-Off
- Physical-phone UI walk-through is still recommended for final mobile UX confidence:
  - iOS Safari
  - Android Chrome
