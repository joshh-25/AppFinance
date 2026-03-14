# Incident Runbook

Operational response guide for production issues.

## Severity Levels
- `SEV-1`: Total outage, data loss risk, or auth failure for all users.
- `SEV-2`: Major feature broken with workaround unavailable.
- `SEV-3`: Partial degradation with workaround available.

## Immediate Actions
1. Confirm impact scope (users, modules, timeframe).
2. Assign incident commander.
3. Freeze non-essential deployments.
4. Capture current system status:
   - `api.php?action=health`
   - latest backend logs
   - latest frontend errors
   - if OCR/bill upload is involved, also use `docs/runbooks/OCRRunbook.md`

## Triage Checklist
- Is DB reachable?
- Are migrations partially applied?
- Are auth endpoints returning expected status codes?
- Are recent changes tied to the failing path?
- If OCR is affected:
  - does `http://localhost:8001/health` respond?
  - does `api.php?action=ocr_health` pass?
  - does `backend/storage/logs/ocr_failures.jsonl` show a recent failure signature?

## Containment
- Roll back latest deploy if issue is release-related.
- Disable problematic feature flags/config toggles if available.
- Switch to manual fallback workflow for billing entry if required.

## Recovery
- Apply fix in smallest safe patch.
- Validate:
  - login/session
  - property list CRUD
  - at least one bill create/update
  - records listing and export
- If OCR was part of the incident, also validate:
  - `.\run-ocr-preflight.cmd`
  - one real bill upload or runtime OCR sample check
- Monitor for 30 minutes after recovery.

## Communication Template
- Incident ID:
- Start time (UTC):
- Severity:
- Affected modules:
- User impact:
- Current status:
- Next update time:

## Post-Incident (within 24h)
- Record root cause and contributing factors.
- Add preventive action items with owners and deadlines.
- Update `docs/CHANGELOG.md` and relevant test coverage.
