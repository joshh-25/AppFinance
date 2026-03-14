# Project Status

## Current
- App state: Stable in production build (`npm.cmd run build` passes).
- Active focus: OCR operational monitoring, local preflight discipline, and final QA.
- Guardrail: New implementation starts only after explicit approval.

## Done
- React migration completed and set as default frontend.
- Session auth flow stabilized (`login`, `session`, logout).
- 4-bill entry flows implemented (Water, Electricity, WiFi/Internet, Association).
- Records merge/export implemented (`DD + Property`, fallback `DD`).
- Property Records CRUD implemented and connected into merged records.
- Records and Property Records tables now fill content area with internal scrolling.
- Excel-safe CSV export fix delivered (BOM + value handling).
- Senior accessibility high-priority pass completed:
  - improved muted contrast
  - minimum 14px for key small text
  - 44x44 touch targets for core controls
  - explicit login error banner
  - explicit toast labels
- Senior accessibility medium-priority pass completed:
  - `:focus-visible` cleanup
  - reduced-motion support
  - form spacing/readability update
  - login right-panel background consistency
  - dynamic page subtitles in `AppLayout`
  - save/update confirmation prompts
- Senior accessibility low-priority pass completed:
  - light sidebar visual polish
  - sticky table headers
  - empty-state CTA blocks
  - mobile hamburger/off-canvas sidebar
  - web font loading consistency
  - upload modal title size tuning

## Next
- Awaiting new approved feature requests.
- For OCR/runtime issues, use `docs/runbooks/OCRRunbook.md` as the primary operational path.

## Risk / Notes
- Keep backend/API/schema unchanged unless explicitly requested.
- Keep `docs/Plan.md`, `docs/Implementation.md`, and `docs/phases.md` synchronized.
- Local OCR stack depends on:
  - `n8n` webhook availability on `localhost:5678`
  - OCR API availability on `localhost:8001`
  - OCR preflight and runtime validation remaining green
