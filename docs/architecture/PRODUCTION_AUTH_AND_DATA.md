# Production Auth & Data — v0.2.1

## Decision

Repassing uses Supabase as the first managed identity and PostgreSQL platform, while application code remains separated behind provider/repository boundaries.

This is deliberately not "Supabase everywhere":

- UI and domain code do not import Supabase directly.
- Identity depends on `IdentityProvider`.
- Organization reads depend on application functions backed by a repository adapter.
- Prisma remains the primary relational application data access layer.
- Payments will use a separate provider abstraction.
- `AUTH_MODE` and `DATA_MODE` allow safe staged activation.

## Why this scales

Supabase provides managed Auth and standard PostgreSQL. PostgreSQL data remains portable; identity subjects are stored separately in `IdentityAccount`; organization IDs are internal UUIDs and never depend on a provider, domain name or country.

For Vercel/serverless runtime, use a pooled PostgreSQL connection for `DATABASE_URL`. Migrations should be run with a migration-safe connection rather than as part of every web build.

## Activation sequence

1. Create a Supabase project in an EU region appropriate for the first Swedish pilot.
2. Configure Auth redirect URLs for local development, the Vercel URL and `https://repassing.se`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel.
4. Add a pooled `DATABASE_URL` to Vercel.
5. Apply the Prisma schema to the database.
6. Keep `DATA_MODE=preview` until the first seed organization/user link exists.
7. Set `AUTH_MODE=supabase` and verify email magic-link login.
8. The auth callback automatically links Supabase identities to Repassing `User` / `IdentityAccount` records while database mode is enabled.
9. Create organization membership data, then verify tenant-scoped reads.

## Security rules

- Never expose a Supabase secret/service-role key to browser code.
- Never authorize organization operations from a client-provided organization ID alone.
- Resolve the authenticated identity server-side, then verify membership/role in PostgreSQL.
- Keep children out of the authentication/transaction model; parent/guardian accounts are the transaction party.
- Secrets exist only in managed environment variables, never committed to Git.
