# Release Checklist

Use this checklist before each production release.

## 1. Scope Freeze
- Confirm release scope and ticket list are finalized.
- Confirm `docs/Plan.md` and `docs/Implementation.md` are up to date.
- Confirm changelog entry is prepared in `docs/CHANGELOG.md`.

## 2. Quality Gates
- Run `php -l` for changed PHP files.
- Run `composer test`.
- Run `npm.cmd run test -- --run` in `frontend/`.
- Run `npm.cmd run build` in `frontend/`.
- Run `php backend/tools/run_migrations.php` in staging or pre-prod.

## 3. Database Safety
- Backup database before migration.
- Verify pending migrations list is expected.
- Validate critical tables after migration:
  - `property_list`
  - `property_billing_records`
  - `schema_migrations`

## 4. Smoke Test
- Login/logout.
- Property List create/update/delete.
- Bills create/update for water, wifi, electricity, association.
- Records search, pagination, edit handoff, and export.
- Upload scan path and fallback error path.

## 5. Release Execution
- Tag release version.
- Deploy backend and frontend artifacts.
- Verify `/Finance/api.php?action=health` returns `status: ok` or `degraded` with expected checks.

## 6. Post-Release Verification
- Check logs for auth failures, 5xx errors, and migration issues.
- Verify business-critical rows can still be created/updated.
- Confirm no open P1 incidents after 30 minutes.
