# Repassing v0.5.4 — Marketplace Simplification

- Removes the hard-coded ÖSK Fotboll marketplace identity and derives club context from live data/filter state.
- Makes the marketplace value proposition clearer for first-time visitors.
- Collapses advanced marketplace filters behind a simple Filter control; active filters remain visible/open.
- Adds a supply-focused empty state with a direct Sell action when the marketplace has no listings.
- Simplifies the Sell flow: SEK is implicit, optional description/club/team/sport/category/brand fields are grouped under “More details”.
- Removes developer-facing LIVE MARKETPLACE/Storage wording from the sell experience.
- Changes mobile navigation from Favorites to Deals/Orders, while Favorites remain available in the header and marketplace.
- No database migration.
