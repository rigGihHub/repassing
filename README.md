# Repassing v0.6.3.6

Cumulative development package focused on the marketplace core flow.

Latest change: selling now has resilient slow-network feedback with real browser upload progress, an explicit server-processing state, offline detection, interrupted-request guidance, client-side oversized-photo protection and a structured JSON response path for enhanced submits while preserving the normal HTML form fallback.

No new database migration was added in v0.6.3.6. Existing unapplied migrations from earlier cumulative releases remain bundled and must be handled during the later verification/deployment pass.

Verification in the preparation environment:
- 23/23 core regression tests passed.
- Modified TS/TSX files passed TypeScript syntax transpilation.
- Full Next.js typecheck/build was not run because project dependencies are not installed in this preparation environment.

### v0.6.3.7 product focus
The deal page is intentionally action-first: one primary next step, while technical details and exceptional actions stay available behind progressive disclosure.

## v0.6.4.0
Deal conversation integration: recent handoff messages and a secondary composer now live directly on the deal page. No database migration added in this release.
