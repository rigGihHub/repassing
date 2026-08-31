# Repassing v0.5.3.2 – Clean Production Recovery

Complete clean replacement package based on the last known stable v0.5.3 code line.

- Public home page no longer fails if marketplace, reference data, session, favorites or notification queries fail.
- Marketplace listing fetch retries without embedded relationships if the enriched PostgREST select fails.
- Listing detail uses the same safe fallback.
- `.next` and `node_modules` are intentionally excluded.
- No v0.6 pilot/admin code is included in this recovery release.
