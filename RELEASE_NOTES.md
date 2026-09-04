# Repassing v0.6.4.0 — Rensa garderoben, lätt version

- Efter publicering visas en tydlig **Sälj en till**-väg.
- Nästa annons kan återanvända förening, lag och sport från den nyss publicerade annonsen.
- Bilder, rubrik, pris, storlek, skick och beskrivning återanvänds inte; varje produkt ska fortfarande beskrivas korrekt.
- Återanvändning sker bara när den inloggade användaren äger källannonsen.
- Magic-link-vägen bevarar `again`-parametern så användaren kommer tillbaka till samma snabba flöde efter inloggning.
- Ingen ny databas-migration i denna release.

# v0.6.3.9 — Low-supply Marketplace Activation

- Makes an empty marketplace actionable without fake listings or demo inventory.
- Empty state now explains the minimum sell flow: photo → price → publish.
- When the live marketplace has 1–10 unfiltered listings, a compact supply-growth prompt appears above the grid instead of another large empty-state panel.
- Sell CTAs preserve the selected organization context when one is active.
- Keeps search-result empty states focused on broadening the search rather than pushing unrelated actions.
- No database changes.

# v0.6.3.8 – Deal Conversation Integration

- Brings the latest deal messages directly into the order page so handoff coordination no longer feels like a separate subsystem.
- Shows only the latest three messages on the deal page to keep the page focused and avoid loading the full conversation thread.
- Adds an inline secondary message composer with a concrete handoff-oriented prompt.
- Keeps the full chat available as a secondary link for longer conversations.
- Message POSTs can safely return to the same order page; external/open redirect paths are rejected.
- Login redirects preserve the intended return path when a session has expired.
- Server still enforces conversation participation through the existing `send_conversation_message` RPC.
- Message length is capped server-side as well as in the UI.
- Adds three regression tests for deal-integrated messaging, safe return paths and server-side message constraints.
- No database migration in this release.

# v0.6.3.6 – Slow Network & Upload Recovery

- Enhances the sell form progressively: normal multipart form POST still works without JavaScript, while JavaScript-capable browsers use a structured upload flow.
- Shows real browser-to-server upload percentage while photos are being sent.
- Changes to a separate “saving and publishing” state after the upload bytes have reached the server, avoiding a misleading frozen button on slow connections.
- Detects offline state before sending large photos.
- Rejects more than 6 photos or photos above 10 MB client-side before wasting bandwidth; server validation remains authoritative.
- Warns against accidental navigation while an upload/publication is still in progress.
- Handles interrupted requests with explicit guidance that the user should check whether the listing was published before retrying, reducing duplicate-listing risk after an uncertain network failure.
- Keeps selected photos available for retry while the user remains on the sell page after a recoverable image/server error.
- Adds a structured JSON response mode to the listing endpoint for enhanced submits while retaining 303 redirects for the plain HTML form fallback.
- Adds four regression tests for progress reporting, offline/interruption handling, preflight image validation and progressive enhancement.
- No new database migration in this release.

# v0.6.3.5 – Actionable Deal Errors

- Replaces generic purchase errors with clear reasons: unavailable item, own listing, expired/invalid session context, oversized message or temporary failure.
- Handoff errors now distinguish stale deal state, wrong participant, invalid action, invalid date/time and temporary infrastructure failure.
- Invalid handoff dates are rejected before any database RPC is called instead of risking a server exception.
- Cancellation errors now distinguish an already-confirmed physical handoff from a deal whose status changed in another tab/device.
- Login redirects from handoff/cancel preserve the exact order page as `next`.
- Adds regression coverage for the error mapping and invalid-date guard.
- No database migration in this release.

# v0.6.3.4 – Cancel & Reopen Safety

- Avbruten reservation/lokal affär återöppnar annonsen när överlämning ännu inte bekräftats.
- Avbryt fungerar även i FULFILLMENT_PENDING när ingen part har bekräftat överlämningen.
- När någon redan bekräftat fysisk överlämning blockeras enkel avbokning för att undvika felaktig återpublicering.
- Upprepade cancel-anrop är idempotenta.
- Ordervyn förklarar att annonsen blir tillgänglig igen.
- Regressionstester för cancel/reopen-flödet.
- Ny migration: `20260903183000_cancel_reopens_listing.sql`.

# v0.6.3.3 – Reservation Retry Safety

- Makes repeated reservation submits by the same buyer idempotent at the database transaction boundary.
- A double tap, refresh retry or browser resubmit now returns the existing in-progress order instead of creating a duplicate or showing a misleading failure.
- Competing buyers remain serialized by the listing row lock; only the first valid buyer can start the deal.
- Adds a client-side submit guard so “Jag vill köpa” disables immediately and shows “Startar affären…”.
- Adds regression coverage for same-buyer retries, competing-buyer protection and the UI submit guard.
- No existing live migration is modified; the new migration is additive and has not been applied automatically.

# v0.6.3.2 – Sell publish resilience

- Creates new listings as DRAFT until every image and image-metadata row has succeeded.
- Makes failure rollback compatible with the existing own-draft delete RLS policy, preventing broken ACTIVE listings without photos.
- Preserves the seller draft if publish fails; clears it only after a successful created listing page is reached.
- Adds a submit guard that disables duplicate publication clicks and shows a publishing state.
- Tightens server-side price, size and optional UUID handling. Currency is fixed to SEK server-side.
- Adds regression tests for draft-first publishing, rollback, draft recovery and duplicate-submit protection.
- No additional database migration beyond the already bundled core authenticated permissions migration.

# Repassing v0.6.3.1 — Core flow regression guard

## Why
A successful Next.js build does not prove that the marketplace transaction state machine is usable. v0.6.3.0 fixed a verified case where an unpaid local reservation could become stuck before handoff. This release prevents that contract from silently regressing.

## Changes
- Adds `tests/core-flow.test.mjs` using Node's built-in test runner; no new package dependency.
- Verifies that the unpaid local-handoff migration:
  - accepts only reservation/payment-pending states,
  - moves the order to `FULFILLMENT_PENDING`,
  - records the transition,
  - remains executable only by `service_role`.
- Verifies that the reservation route activates the handoff bridge only when Stripe mode is disabled.
- Verifies that the order UI exposes local handoff for the correct states and payment UI only in live Stripe mode.
- Verifies that the Payouts entry point remains hidden outside Stripe mode.
- CI now runs `npm run test:core` before typecheck and build.
- `npm run check` and `npm run verify` now include the regression test.

## Database
No new database migration in v0.6.3.1. It retains the v0.6.3.0 migration `20260903111500_activate_unpaid_local_handoff.sql`, which still needs to be applied and verified before release if it has not already been applied.

## Verification status
The dependency-free core regression test can be run in any Node 20+ environment. Full Next.js typecheck/build still requires installed project dependencies and must be completed before deployment.

## v0.6.3.7 — Deal Next-Step Clarity

- Reworked the deal detail page around one clear primary next action.
- Local handoff now guides users through planning first, then confirmation.
- Waiting states explicitly say when the user has nothing to do.
- Messages and listing links are secondary actions rather than competing primary CTAs.
- Technical order facts, history, handoff edits and cancellation are progressively disclosed.
- Added compact handoff summary and participant confirmation state.
- Added regression coverage for next-step hierarchy and progressive disclosure.
- No new database migration in this release.
