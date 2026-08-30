# Repassing v0.3.1-fixed

Production Auth & Data Foundation, corrected for repository use.

## Fixes
- Corrected the migration filename/order for `wire_auth_identity_and_user_policies` to `20260829203642_...`.
- Keeps Supabase/PostgreSQL + versioned SQL migrations as the database source-of-truth direction.
- Supabase Auth uses server-side cookie sessions and internal Repassing user IDs remain separate from Supabase auth subjects.

## Important
The live Supabase database contains additional migrations created after this application release (marketplace services, catalog/i18n, onboarding/analytics, transactions, finance, trust & safety, privacy, notifications/outbox, search, recommendations and liquidity). Do not run a destructive migration reset or assume this folder is a complete replay of the current production database yet. A later repository-sync release should add the complete live migration history before `supabase db reset` / full replay is used.
