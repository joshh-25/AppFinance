# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]
- Final local-only production readiness pass:
  - Completed release-blocker fixes across billing, property, review queue, access control, security hardening, performance hardening, and codebase simplification.
  - Expanded frontend regression coverage to `72` passing tests, including focused unit coverage for extracted billing/review helpers.
  - Synced product, release, and roadmap docs with the current local-only delivery target.
  - Added a final local release validation record for the approved deployment target.
  - Completed OCR operationalization, runtime validation, failure monitoring, cleanup, and runbook handoff for the local OCR stack.
  - Added a refreshed local release validation record covering frontend build, backend tests, and OCR parser/runtime validation.

## [2026-02-26]
- Phase 1 Foundation completed:
  - Added login protection and audit logging.
  - Added server-side records filtering/pagination.
  - Added DB migration for login attempts and billing indexes.
