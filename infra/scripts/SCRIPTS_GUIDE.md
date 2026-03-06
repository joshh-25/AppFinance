Place deployment and maintenance scripts here.

Related example assets are centralized under `Examples/` (see `Examples/EXAMPLES_INDEX.md`).

- `check-frontend-build-freshness.mjs`
  Verifies `frontend/dist/.vite/manifest.json` is newer than frontend source files.
  Use before deploy to prevent shipping stale frontend bundles.

- `validate-ocr-parser-samples.mjs`
  Runs OCR parser validation against `Examples/Samples/parser_validation_input.json`.
  Use `--check` for CI/preflight and `--write` to refresh report artifacts.



