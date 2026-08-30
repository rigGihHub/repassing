# Repassing v0.4.0 — Live marketplace foundation

This release moves the web app from authenticated demo shell toward a real Supabase-backed marketplace.

## Included
- Real ACTIVE/CLEAR listings are loaded from Supabase on the marketplace home page.
- Signed-in users can create and immediately publish a listing through `/sv/sell` or `/en/sell`.
- Listing writes use the authenticated internal Repassing user id and existing RLS policies.
- Sell form uses live organizations, teams, sports, categories and brands from the database.
- Profile shows the authenticated seller's real listings and provides a create-listing action.
- Mock listings remain only as an empty-market fallback so the product does not look broken before seed inventory exists.

## Deliberately deferred
- Listing image upload/object storage.
- Listing detail/edit pages.
- Favorites and saved-search UI.
- Checkout/payment provider integration.

These are the next product increments after the live create/read loop is verified in production.
