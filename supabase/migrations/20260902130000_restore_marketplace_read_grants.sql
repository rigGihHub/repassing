-- Repassing v0.6.0.7 — restore marketplace read access
-- RLS policies already restrict these tables to public/active marketplace data.
-- The table-level SELECT grants are also required; without them PostgREST/RPC
-- requests fail before RLS can evaluate the existing policies.

grant select on table public.listings to anon, authenticated;
grant select on table public.listing_images to anon, authenticated;
grant select on table public.organizations to anon, authenticated;
grant select on table public.teams to anon, authenticated;
grant select on table public.sports to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.brands to anon, authenticated;
