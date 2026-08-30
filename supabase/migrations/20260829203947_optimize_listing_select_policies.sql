drop policy if exists listings_public_active_read on public.listings;
drop policy if exists listings_read_own on public.listings;
create policy listings_anon_active_read on public.listings for select to anon using (status='ACTIVE');
create policy listings_authenticated_read on public.listings for select to authenticated using (status='ACTIVE' or seller_user_id=private.current_app_user_id());
