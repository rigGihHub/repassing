# Repassing v0.5.1 — Seller payouts & Stripe Connect onboarding

- Adds seller payout centre at `/{locale}/payouts`.
- Uses Stripe Accounts v2 Recipient configuration for marketplace sellers.
- Requests `stripe_balance.stripe_transfers` and uses Stripe-hosted onboarding through Accounts v2 Account Links.
- Stores only Stripe account identifiers/status in Repassing; bank details remain with Stripe.
- Adds explicit transfer capability status and requirement counters to `payout_accounts`.
- Adds authenticated onboarding, refresh and manual status-sync routes.
- Checkout now requires an ACTIVE seller payout account with active transfers.
- Keeps live onboarding disabled until Stripe secrets and `PAYMENT_MODE=stripe` are configured.

Important: the marketplace Accounts v2 configuration uses Express dashboard with platform responsibility for Stripe fees and connected-account negative balances, matching Stripe's marketplace guide. This responsibility must be reviewed and accepted in Stripe before production activation.
