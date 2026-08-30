# ADR-007 — Supabase for first managed Auth + PostgreSQL

Status: Accepted for MVP foundation

## Context
Repassing needs real authentication and durable relational data without creating a custom identity/security stack. It must also remain portable if scale, geography, cost or regulation later requires provider changes.

## Decision
Use Supabase Auth as the first managed identity provider and Supabase PostgreSQL as the first managed database. Keep Supabase behind application adapters and keep Repassing's internal user/organization IDs provider-independent.

Prisma remains the relational application data layer. Auth identity and Repassing user profile are intentionally separate concepts.

## Consequences
- Faster secure MVP and pilot setup.
- Standard PostgreSQL minimizes database lock-in.
- Provider boundary allows future Auth migration.
- Runtime uses pooled PostgreSQL connections on serverless hosting.
- Repassing must maintain explicit identity-to-user synchronization and server-side authorization.
