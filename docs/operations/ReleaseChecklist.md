# Release Checklist

Use this checklist before each release candidate or GitHub publish.

## 1. Scope and Docs
- Confirm the release scope matches `docs/phases.md`.
- Sync `docs/product/Features.md` if workflows, counts, or runtime assumptions changed.
- Confirm any local-only deployment assumptions are still true.

## 2. Frontend Gates
- Run `npm run lint` in `frontend/`.
- Run `npm run test -- --run` in `frontend/`.
- Run `npm run build` in `frontend/`.
- Verify the login screen works on the Vite dev server and the built app shell.

## 3. Backend Gates
- Run `composer test` in `backend/`.
- Run `php -l` on changed PHP files.
- Run `php backend/tools/run_migrations.php` when schema changes are present.

## 4. Workflow Smoke Test
- Login and logout.
- Create and update one bill in each bill module you changed.
- Verify Records search, pagination, export, and edit handoff still work.
- Verify Bills Review upload, retry, requeue, and save still work.
- Verify Property Records create/edit/delete still work if that area changed.

## 5. Local Runtime Checks
- Confirm MySQL, Apache/XAMPP, and local OCR/n8n are reachable.
- Confirm `N8N_WEBHOOK_URL` still points to the intended local OCR endpoint.
- If using Docker OCR autorun, confirm Docker Desktop and the `n8n` container still restart correctly after reboot.
- Run `.\run-ocr-preflight.cmd` from the repo root.
- Run `node infra/scripts/validate-ocr-runtime-samples.mjs --check` if OCR, n8n, or bill parsing changed.
- Confirm `backend/storage/logs/ocr_failures.jsonl` does not show a new unresolved recurring failure pattern before release.

## 6. Release Decision
- Do not call the app `Production Ready` until Phase 24 is complete.
- For local-only GitHub publishes, require green lint, tests, build, backend tests, and OCR preflight/runtime validation before push.
