# Finance

Finance is organized as a monorepo with clear backend/frontend boundaries and root-level compatibility shims.

## Project Structure

```text
Finance/
├─ backend/                  # PHP backend (API, business logic, DB scripts, tests)
│  ├─ public/                # Runtime entrypoints
│  ├─ src/                   # Core + modules
│  ├─ config/                # App/database/routes config
│  ├─ database/              # schema + migrations + seeds
│  ├─ tools/                 # setup/import/migration scripts
│  └─ tests/                 # Unit/Integration/Smoke
├─ frontend/                 # React + Vite app
│  ├─ src/
│  └─ public/
├─ Examples/                 # Centralized examples/samples/templates (non-runtime)
├─ docs/                     # Architecture/product/operations/runbooks/wireframes
├─ infra/                    # CI, env docs, ops scripts
├─ tests/e2e/                # Reserved for cross-app e2e tests
├─ index.php                 # Root compatibility shim -> backend/public/index.php
├─ api.php                   # Root compatibility shim -> backend/public/api.php
├─ login.php                 # Root compatibility shim -> backend/public/login.php
├─ logout.php                # Root compatibility shim -> backend/public/logout.php
└─ db.php                    # Root compatibility shim -> backend/db.php
```

Examples index:
- See `Examples/EXAMPLES_INDEX.md` for sample files, templates, and OCR validation assets.

## Run

Backend:

```powershell
cd backend
composer install
php tools/run_migrations.php
composer test
```

Frontend:

```powershell
cd frontend
npm install
npm run build
```

OCR preflight:

```powershell
cd C:\xampp\htdocs\Finance
.\run-ocr-preflight.cmd
```

OCR failure log:

- Runtime OCR upload and workflow-health failures are written to `backend/storage/logs/ocr_failures.jsonl`.
- Each line is JSON and includes `request_id`, failure kind, and summarized upstream details.
- Temporary OCR probe files and local OCR logs are generated artifacts and are intentionally kept out of git.
- OCR operating steps and recovery guidance are documented in `docs/runbooks/OCRRunbook.md`.


