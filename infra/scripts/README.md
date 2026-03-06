Place deployment and maintenance scripts here.

- `check-frontend-build-freshness.mjs`
  Verifies `frontend/dist/.vite/manifest.json` is newer than frontend source files.
  Use before deploy to prevent shipping stale frontend bundles.

- `validate-ocr-parser-samples.mjs`
  Runs OCR parser validation against `docs/samples/parser_validation_input.json`.
  Use `--check` for CI/preflight and `--write` to refresh report artifacts.
