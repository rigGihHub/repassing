# ADR-008 — Versioned SQL migrations are the database source of truth

Status: Accepted

Repassing uses Supabase/PostgreSQL directly and stores canonical DDL in `supabase/migrations`.
The web runtime uses Supabase Auth, session cookies, PostgREST and Row Level Security.

We intentionally removed Prisma from the runtime and repository in v0.3.1 to avoid maintaining two competing schema definitions. This keeps authorization close to PostgreSQL and makes the same data contract usable by web, future native clients and integrations.

A separate ORM may be introduced later for a service that materially benefits from it, without changing database ownership or domain IDs.
