Place deployment and maintenance scripts here.

Related example assets are centralized under `Examples/` (see `Examples/EXAMPLES_INDEX.md`).

- `check-frontend-build-freshness.mjs`
  Verifies `frontend/dist/.vite/manifest.json` is newer than frontend source files.
  Use before deploy to prevent shipping stale frontend bundles.

- `validate-ocr-parser-samples.mjs`
  Runs OCR parser validation against `Examples/Samples/parser_validation_input.json`.
  Use `--check` for CI/preflight and `--write` to refresh report artifacts.

- `validate-ocr-runtime-samples.mjs`
  Runs live OCR runtime validation against `http://localhost:8001/ocr` and the configured n8n webhook using the sample PDFs.
  Use `--check` for CI/preflight and `--write` to refresh `ocr_runtime_validation_report.json` and `.md`.

- `..\..\run-ocr-preflight.cmd`
  Root-level OCR preflight entry point.
  Starts the OCR API if needed, then runs both parser and live runtime validation checks in sequence.

- OCR failure monitor log
  Runtime OCR upload and health-probe failures are appended to `backend/storage/logs/ocr_failures.jsonl`.
  Use this file to trace `request_id`, upstream status/error details, and failing sample-file probes without digging through Apache output first.

- OCR cleanup note
  Temporary OCR probe files such as `final_webhook_probe.txt` and `ocr_webhook_response.txt` are disposable local artifacts and should not be committed.
  Generated OCR logs under `backend/storage/logs/` are also local-only runtime artifacts.

- OCR operational runbook
  See `docs/runbooks/OCRRunbook.md` for startup, preflight, validation, logging, and common failure recovery steps.
