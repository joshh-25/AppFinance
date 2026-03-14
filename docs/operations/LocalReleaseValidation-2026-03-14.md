# Local Release Validation - 2026-03-14

## Final Delivery Target

This app is released as a **local-only responsive web app** for one signed-in operator.

Supported local stack:
- Apache/PHP via XAMPP
- MySQL
- React frontend built with Vite and served through `backend/public/index.php`
- OCR pipeline through local Docker/n8n on `localhost:5678`
- Local OCR API on `localhost:8001`

Out of scope for this release target:
- public internet deployment
- app-store packaging
- wrapped mobile apps
- multi-user collaboration workflows

## Release Candidate Checks

Frontend:
- `npm run build` -> pass

Backend:
- `composer test` -> pass
- `php -l backend/src/Modules/Bills/LegacyBills.php` -> pass

OCR validation:
- `node infra/scripts/validate-ocr-parser-samples.mjs --check` -> pass (`9/9`)
- `node infra/scripts/validate-ocr-runtime-samples.mjs --check` -> pass (`18/18`)

## Local Operational Verdict

Release candidate status: **approved for local daily use**

Why:
- frontend production build is green
- backend automated test gate is green
- OCR parser and live runtime validation are green
- OCR monitoring, preflight, cleanup, and runbook handoff are now in place
- the app remains aligned with its approved target: one-person local operation

## Final Product Classification

For the intended local-only setup, the app is:

**Product Ready for Local Use**

Important limit:
- this verdict applies to the **local-only single-operator deployment target**
- it does **not** mean public-hosted SaaS readiness or app-store readiness
