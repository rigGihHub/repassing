# Repassing v0.5.3.1 – Emergency production recovery

- Based on the last known-good v0.5.3 production code line.
- Makes marketplace listing loading fail-safe on the public homepage.
- Also isolates reference data, session, favorites and notification-count failures so they cannot crash the homepage.
- Temporarily excludes the unverified v0.6.0/v0.6.1 pilot-club additions while their build failure is investigated separately.
- No database migration is required for this recovery release.
