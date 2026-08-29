# ADR-002: Explicit domain boundaries

Status: Accepted

Business logic is grouped by bounded context under `src/modules`. Route handlers and UI components orchestrate use cases but do not contain marketplace rules. This allows Repassing to remain a modular monolith now and extract services later only where justified.
