create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

create policy sports_public_read on public.sports for select using (status='ACTIVE');
create policy categories_public_read on public.categories for select using (status='ACTIVE');
create policy brands_public_read on public.brands for select using (status='ACTIVE');
create policy listings_public_active_read on public.listings for select using (status='ACTIVE');
create policy listing_images_public_active_read on public.listing_images for select using (exists(select 1 from public.listings l where l.id=listing_id and l.status='ACTIVE'));
create policy organizations_public_active_read on public.organizations for select using (status='ACTIVE');
create policy teams_public_active_read on public.teams for select using (status='ACTIVE');
