# Payments domain

v0.5.0 adds a provider-isolated marketplace payment foundation.

- Order fees are frozen when the reservation becomes an order.
- The default Swedish rule is 3% paid by the seller, minimum 1 SEK.
- Buyer total, platform fee and seller net are stored separately.
- Stripe Connect destination-charge checkout is prepared server-side only.
- Stripe secrets and the Supabase service-role key are never exposed to the browser.
- Stripe webhooks are signature-verified and processed idempotently through `payment_events`.
- Live checkout remains disabled until `PAYMENT_MODE=stripe`, Stripe secrets and a seller payout account are configured.

The payment provider is intentionally isolated from Orders and Fulfillment so another marketplace-payment provider can be added later without changing the core order model.
