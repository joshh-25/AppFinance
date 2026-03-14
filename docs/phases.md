# Core Project Phases

## Current Status
- The core app already works for billing, property records, monthly records, OCR review, records, and dashboard use.
- To reach a near-100% web app for real daily use, the next work should focus only on the highest-impact gaps.
- Latest CI note: frontend billing integration regressions were fixed after release finalization, and the current branch has been republished to refresh GitHub Actions on the repaired state.
- Phase 17 is complete: the Records -> Property Records handoff bug is fixed, the misleading remember-me control is removed, frontend lint is clean again, and regression coverage now protects the property edit handoff.
- Phase 18 is complete: frontend access now matches the backend permission model, unsupported modules stay hidden, and mixed screens stay read-only instead of leading into avoidable forbidden save flows.
- Phase 19 is complete: Bills Review queue state now persists in the backend, Dashboard review counts come from the same backend source, and review progress survives browser refreshes and device changes for the same signed-in user.
- This app should stay optimized for one signed-in operator, not multi-user collaboration, audit workflows, or team features.
- Phase 20 is complete: core table-heavy screens now have phone-friendly card layouts, mobile sticky actions, and camera-first upload entry points, with frontend verification passing after the mobile UX upgrade.
- Phase 21 is complete: merged records now use backend pagination and filters, Dashboard now loads a lightweight summary instead of polling the full merged dataset, large bill images are compressed before upload, and a repeatable benchmark tool now validates scale safely with transactional benchmark seeding. Benchmark runs completed cleanly against production-like datasets up to 10,000 monthly rows without leaving test data behind.
- Phase 22 is complete for local-only use: shared security/runtime helpers now apply CSP and HSTS-aware headers, session cookies use stricter bootstrap settings, logout now uses a CSRF-protected POST flow, bill uploads validate content more defensively, and the frontend now reads deploy base paths from runtime config instead of hardcoded `/Finance` paths. Local lint, tests, backend smoke checks, and production build all passed after the hardening pass. Public HTTPS deployment validation is intentionally out of scope for this local-only setup.
- Phase 23 is complete: billing, records, and property cross-screen workflow storage is now centralized in one shared helper, `PaymentFormPage.jsx` and `BillReviewPage.jsx` now delegate pure logic to focused helper modules, direct unit coverage now protects those extracted paths, and product/release docs are synced with the current app behavior and test inventory.
- The app can now be treated as `Production Ready` for its intended local-only single-operator deployment target. Public-hosted deployment and app-store packaging remain out of scope.

## Phase 1: Core Billing Base (Completed)
- Built the main billing form, saving flow, and records listing.
- Moved the app to focus on utility billing.

## Phase 2: Multi-Bill Support (Completed)
- Added Water, Internet, Electricity, and Association bill handling.
- Kept one consistent billing workflow.

## Phase 3: Login and Safety (Completed)
- Added login and logout.
- Protected the dashboard and API for the signed-in operator only.

## Phase 4: Property Records (Completed)
- Added Property Records with create, update, and search support.
- Linked property details to billing records.

## Phase 5: Better Bill Entry (Completed)
- Added Property or DD lookup in bill forms.
- Showed only the fields needed for each bill type.
- Reduced entry mistakes and confusion.

## Phase 6: Monthly Record Rules (Completed)
- Enforced one active monthly record per property and due period.
- Prevented duplicate monthly rows from causing confusion.

## Phase 7: Records Workspace (Completed)
- Improved the Records page for monthly review, search, filters, and export.
- Kept the records area focused on one clear monthly record view.

## Phase 8: OCR Upload and Review (Completed)
- Added OCR upload support for bills.
- Improved failed-scan handling with retry and requeue actions.
- Kept review and correction work in one Bills Review screen.

## Phase 9: Senior-Friendly Dashboard (Completed)
- Simplified the dashboard to show the most important totals and recent records.
- Kept the main page easier to understand for daily use.

## Phase 10: Reliability Cleanup (Completed)
- Fixed saving, data, and monthly-record reliability problems.
- Removed optional screens so the app stays focused on core work.

## Phase 11: Workflow Simplification (Completed)
- Reduced confusing wording in Billings, Bills Review, Records, and Property Records.
- Replaced technical or ambiguous action labels with clearer daily-use language.
- Added clearer guidance around edit choices and recovery actions so core screens are easier to understand.

## Phase 12: Form and Table Cleanup (Completed)
- Broke large billing and property forms into clearer detail sections instead of one large block of fields.
- Improved toolbar layout in Records and list views so search and filter controls are easier to scan.
- Made primary actions stand out more clearly while quieter actions stay secondary.

## Phase 13: Error Prevention and Recovery (Completed)
- Made validation messages clearer and more human-readable in billing, property records, and Bills Review.
- Added stronger pre-save checks so common mistakes are blocked earlier with clearer guidance.
- Improved recovery wording for missing property, missing due period, and incomplete bill details.

## Phase 14: Save Confidence and Feedback (Completed)
- Make save, update, upload, and edit states clearer everywhere.
- Show stronger success, warning, and error feedback so you always know what happened.
- Reduce uncertainty after pressing buttons.

## Phase 15: Maintainability Refactor (Completed)
- Split very large frontend pages into smaller, easier-to-maintain parts.
- Reduce duplicated logic in billing, records, and review flows.
- Make the codebase easier to improve without breaking working features.

## Phase 16: Final Quality Pass (Completed)
- Review every core screen for clarity, consistency, and speed.
- Test the app as a real end user would: create, review, edit, save, search, and export.
- Fix the last high-impact UX and logic problems before calling the app complete.

## Production Readiness Plan

## Phase 17: Release Blockers and Data Correctness (Completed)
- Fix the Records -> Property Records edit handoff so property updates always use the correct property record ID.
- Review all cross-screen edit/update flows between Records, Bills, Property Records, and Expenses for wrong-target updates or stale session state.
- Remove current lint failures and close any known save/update regressions with integration coverage before further feature work.
- Make the login UX truthful by either implementing "Keep me logged in" securely or removing the option.

## Phase 18: Frontend Access Alignment (Completed)
- Read the signed-in user role on the frontend and hide or disable actions the user cannot perform.
- Align frontend screens with backend permissions so the signed-in operator does not reach avoidable 403/Forbidden save flows.
- Add tests for role-based navigation, buttons, and protected workflows.

## Phase 19: Persistent Review Queue and Dashboard Truth (Completed)
- Replace Bills Review `localStorage` queue state with backend persistence so review work stays available across the same user's browsers and devices.
- Drive dashboard review counts and alerts from backend data instead of browser-local state.
- Keep review state simple for one-person use: persist upload failures, retries, requeues, and saves reliably without adding audit/history features.

## Phase 20: Mobile-First UX Upgrade (Completed)
- Redesign the most table-heavy screens for phones using card/detail layouts, bottom sheets, or drill-down views instead of wide horizontal tables.
- Add larger touch targets, clearer visual hierarchy, sticky primary actions, and camera-first upload behavior for mobile use.
- Remove mobile friction in the core flows: login, upload, review, save, edit, search, and export.
- Validate the full primary workflow on small screens before calling the app mobile-ready.

## Phase 21: Performance and Scale Safety (Completed)
- Add paginated and filterable backend endpoints for merged records and any other views that currently load full datasets.
- Replace dashboard full-list polling with summary endpoints and lighter refresh behavior.
- Optimize heavy mobile paths by compressing uploaded images, lazy-loading OCR/PDF code, and reducing repeated large fetches.
- Recheck response times and memory usage with larger production-like benchmark datasets.

## Phase 22: Security and Session Hardening (Completed for Local-Only Use)
- Add production security headers such as CSP and HSTS and verify the deployment configuration for HTTPS-only use.
- Harden upload handling with stricter validation and production safeguards around document processing.
- Finalize secure session behavior, CSRF coverage, logout behavior, and base-path configuration for deploy portability.
- Review auth and rate-limit behavior under failure scenarios.

## Phase 23: Codebase Simplification and Test Expansion (Completed)
- Split oversized frontend and backend modules into smaller units with clearer ownership and less hidden coupling.
- Centralize edit/navigation state so cross-module workflows are easier to reason about and safer to change.
- Add end-to-end coverage for the most important release paths: cross-screen editing, role restrictions, OCR failure recovery, and mobile flows.
- Keep docs, feature inventory, and release checklists synced with the actual app behavior and current test counts.

## Phase 24: Release Packaging and Go-Live Validation (Completed for Local-Only Use)
- Final delivery target is now defined clearly: a local-only responsive web app served through XAMPP/PHP with local MySQL and local Docker/n8n OCR support.
- App-store packaging, wrapped mobile builds, and public-hosted deployment are intentionally out of scope for this release target.
- Final release-candidate checks, build freshness checks, OCR parser sample validation, monthly identity health checks, and local service health probes all passed.
- The app is now `Production Ready` for the approved local-only single-operator deployment target.

## Phase 25: OCR Accuracy and Health Reliability (Planned)
- Stabilize the local OCR service startup path so the OCR API, n8n workflow, and Finance upload flow stay aligned after restarts.
- Strengthen OCR field extraction in `C:\ocr\app.py`, especially for `billing_period`, `property`, `dd`, provider names, and other fields that are visible in OCR text but still not mapped.
- Improve scanned/image-only PDF handling beyond basic text extraction so rendered-image OCR is reliable for common bill uploads.
- Add clearer missing-field validation and OCR warnings so partial extraction is obvious before save.
- Upgrade OCR health reporting so it reflects real workflow readiness, not only basic service reachability.
- Add regression checks for text PDFs, image-only PDFs, and sample bill types so OCR parser improvements do not silently break later.

## Phase 35: OCR Operationalization (Completed)
- Added a single-command OCR preflight at `run-ocr-preflight.cmd`.
- OCR preflight now starts the OCR API if needed, checks parser sample validation, and checks live runtime validation against both the OCR API and the n8n webhook.
- Added runtime OCR validation reports alongside the existing parser validation artifacts so OCR regressions can be checked without manual bill uploads.
- Documented the operational OCR commands in `README.md` and `infra/scripts/SCRIPTS_GUIDE.md`.

## Phase 37: Sample Coverage Expansion (Completed)
- Expanded OCR validation coverage with additional real invoice PDFs from `Examples/Excel`, including new association and electricity layouts.
- Added separate parser-layer and runtime-layer expectations so text normalization checks stay realistic while live OCR checks remain strict.
- Parser validation now covers 9 sample documents, and live OCR runtime validation now covers 18 target checks across `ocr_api` and `n8n_webhook`.

## Phase 36: OCR Monitoring and Failure Logging (Completed)
- Added lightweight OCR failure monitoring for real bill uploads and OCR workflow health probes.
- OCR failures now persist to `backend/storage/logs/ocr_failures.jsonl` with request IDs, upstream status/error summaries, and sample-file context for failed health probes.
- OCR monitor failures also emit audit entries so repeated OCR upload issues can be traced without relying only on raw Apache/PHP logs.

## Phase 38: OCR Cleanup and Artifact Hygiene (Completed)
- Removed stale temporary OCR probe outputs that were only useful during one-off debugging.
- Added git ignore coverage for local OCR logs, temporary workflow dumps, and probe artifacts so routine OCR work stops polluting repo status.
- Synced the OCR docs so the current operational path points only to the maintained preflight, runtime validation, and monitor log flow.

## Phase 39: OCR Runbook and Operational Handoff (Completed)
- Added a dedicated OCR runbook covering startup, health checks, runtime validation, logs, common failure signatures, and recovery order.
- Linked the OCR runbook from the root README and script guide so the current operational path is documented in one place.
- Finished the OCR phase track with a maintainable handoff instead of leaving recovery knowledge scattered across temporary notes.

## Phase 40: OCR Ops Doc Integration (Completed)
- Updated the project status doc so OCR operational monitoring and local preflight discipline are reflected as the current steady-state focus.
- Linked the OCR runbook into the main incident runbook so OCR-related incidents now follow the same documented recovery path.
- Finished the OCR documentation track by aligning status, runbook, and script docs around one maintained OCR operating flow.

## Phase 41: Release Finalization (Completed)
- Ran the highest-signal local release gates again: frontend production build, backend tests, OCR parser validation, OCR runtime validation, and OCR-related PHP syntax checks.
- Tightened the release checklist so OCR preflight, runtime validation, and OCR monitor-log review are part of the standard local release decision.
- Added a refreshed local release validation record confirming the app is product ready for the approved local-only single-operator deployment target.

## Production Ready Exit Criteria
- No known wrong-record update paths or critical save/edit correctness bugs remain.
- Frontend permissions fully match backend RBAC expectations.
- Bills Review and dashboard review counts come from backend-persisted state.
- Core daily workflows work cleanly on phone-sized screens without depending on horizontal table scrolling.
- Build, tests, lint, migration checks, and release checklist all pass on the release candidate.
- Security hardening, deployment configuration, and release monitoring are in place.

## 100% Focus Rules
- Only improve parts that directly help daily billing work.
- Do not add optional admin-only or technical-only features.
- Do not add team collaboration, audit trail screens, or other multi-user workflow features.
- Prefer simplicity, clarity, and reliability over more features.
 
