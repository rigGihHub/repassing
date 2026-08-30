# Repassing v0.5.0 — Payment Foundation

## Added
- Fee breakdown on orders: buyer fee, seller fee, platform fee, seller net.
- Default Swedish fee rule: 3% seller commission with 1 SEK minimum.
- Stripe Connect destination-charge Checkout integration.
- Server-only Supabase admin client.
- Signed Stripe webhook endpoint with 5-minute replay tolerance.
- Idempotent payment-event processing.
- Order UI now shows price, Repassing fee, seller proceeds and checkout state.
- Payment-mode runtime switch (`disabled`, `preview`, `stripe`).

## Deliberate boundary
Live payments are not enabled by this release alone. Production activation requires Stripe credentials, a webhook secret, a Supabase service-role key and completed seller payout onboarding. No secret is committed to the repository.

## Architecture
Stripe is an adapter, not the order model. Orders, payments, payouts and fulfillment remain separate so Repassing can change payment provider or support country-specific providers later.
