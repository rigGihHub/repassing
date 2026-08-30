# v0.3.1 — Live Auth & App Connection

## Runtime model

- Supabase Auth owns authentication and secure session cookies.
- A database trigger on `auth.users` creates the Repassing `public.users` row and `identity_accounts` mapping.
- Application reads use the user's Supabase session and Row Level Security. No service-role key is required by the web app.
- Private marketplace data stays deny-by-default. Public catalog/marketplace discovery has explicit read policies only.
- `current_app_user_id()` maps `auth.uid()` to the internal Repassing user UUID without coupling domain IDs to an auth provider.

## Why this scales

Repassing identity remains provider-independent while Supabase provides managed auth. The internal user UUID survives future auth-provider changes. Organizations and memberships remain separate tenant-domain data. Payment and fulfillment remain separate domains.

## Production environment

Set in Vercel for Production and Preview:

- `AUTH_MODE=supabase`
- `DATA_MODE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL=https://jjngpglslxrsqeynakra.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>`
- `NEXT_PUBLIC_APP_URL=https://repassing.se` when the custom domain is live; until then use the production Vercel URL.
