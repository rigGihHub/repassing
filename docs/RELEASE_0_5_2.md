# Repassing v0.5.2 — Handoff completion

This release closes the first end-to-end marketplace loop after a confirmed payment.

## State flow

`PAID → FULFILLMENT_PENDING → COMPLETED`

For local handoff, one participant first schedules the exchange. The seller confirms physical handoff and the buyer confirms receipt. Completion is only written after both sides have confirmed.

## Sustainability event

When the order reaches `COMPLETED`, Repassing inserts one `ITEM_REUSED` event connected to the order, listing, organization and buyer. A partial unique index prevents duplicate reuse events if the completion operation is retried.

## Trust boundary

The browser never receives service-role credentials. The API authenticates the current Repassing user, verifies that the user participates in the order and only then calls the service-role-only database transaction function.
