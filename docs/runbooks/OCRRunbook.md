# OCR Runbook

Operational guide for the local OCR stack used by bill uploads.

## Scope
- Finance frontend uploads bill files to the PHP backend.
- PHP forwards uploads to the configured n8n webhook.
- n8n calls the local OCR API on port `8001`.
- OCR responses flow back through n8n into the Finance bill form and Bills Review.

## Standard Startup
1. Start or verify the OCR API:
   ```powershell
   cd C:\xampp\htdocs\Finance
   .\start-ocr-api.cmd
   ```
2. Run OCR preflight:
   ```powershell
   cd C:\xampp\htdocs\Finance
   .\run-ocr-preflight.cmd
   ```
3. Confirm `n8n` is reachable at:
   - `http://localhost:5678`

## Health Checks
- OCR API health:
  - `http://localhost:8001/health`
- Finance OCR workflow health:
  - `api.php?action=ocr_health`
- Full OCR runtime sample validation:
  ```powershell
  node infra/scripts/validate-ocr-runtime-samples.mjs --check
  ```
- Parser-only validation:
  ```powershell
  node infra/scripts/validate-ocr-parser-samples.mjs --check
  ```

## Logs and Diagnostics
- OCR monitor log:
  - `backend/storage/logs/ocr_failures.jsonl`
- PHP/Apache error log:
  - use the active XAMPP Apache/PHP error log
- OCR runtime reports:
  - `Examples/Samples/ocr_runtime_validation_report.json`
  - `Examples/Samples/ocr_runtime_validation_report.md`
- Parser validation reports:
  - `Examples/Samples/parser_validation_report.json`
  - `Examples/Samples/parser_validation_report.md`

## Common Failures

### `Document processing service returned an empty response.`
- Meaning:
  - n8n returned `2xx`, but the response body was blank.
- Check:
  - `backend/storage/logs/ocr_failures.jsonl`
  - n8n workflow execution output
  - OCR API health on `8001`

### `Unable to reach document processing service.`
- Meaning:
  - the backend could not get any response from the webhook.
- Check:
  - `N8N_WEBHOOK_URL` in `.env`
  - local n8n container/service status
  - Docker networking between n8n and the OCR API

### OCR API health check failed
- Meaning:
  - `http://localhost:8001/health` is down or unhealthy.
- Fix:
  - restart OCR with `.\start-ocr-api.cmd`
  - verify port `8001` is not blocked or already occupied by the wrong process

### OCR fields are incomplete
- Meaning:
  - OCR transport worked, but extraction quality was partial.
- Check:
  - bill type and sample layout
  - parser/runtime validation reports
  - Bills Review warnings and confidence hints

## Recovery Order
1. Restart OCR API.
2. Re-run OCR preflight.
3. Re-run runtime sample validation.
4. Retry a real upload.
5. If still failing, inspect:
   - `ocr_failures.jsonl`
   - n8n execution details
   - OCR API terminal output

## Notes
- Local OCR logs and temporary OCR probe artifacts are runtime-only and should not be committed.
- Keep sample validation reports current when parser or OCR runtime behavior changes.
