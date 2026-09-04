-- Repassing v0.6.1.7
-- Restore the table privileges required by already-existing RLS policies
-- for the authenticated core marketplace flow.

-- Listings: authenticated users may create/manage their own listings.
grant select, insert, update, delete on table public.listings to authenticated;

-- Listing image metadata: public read is already controlled by RLS.
-- Authenticated sellers need to insert/delete metadata for their own listings.
grant select, insert, delete on table public.listing_images to authenticated;

drop policy if exists "listing_images_insert_own_listing" on public.listing_images;
create policy "listing_images_insert_own_listing"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_user_id = private.current_app_user_id()
  )
);

drop policy if exists "listing_images_delete_own_listing" on public.listing_images;
create policy "listing_images_delete_own_listing"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_user_id = private.current_app_user_id()
  )
);

-- Favorites: existing RLS limits all access to the signed-in user's own rows.
grant select, insert, delete on table public.favorites to authenticated;

-- Orders and messaging are read directly by the app while mutations are
-- handled by controlled RPCs/admin routes. Existing RLS limits reads to
-- participants, so only SELECT is restored here.
grant select on table public.orders to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.conversation_participants to authenticated;
grant select on table public.messages to authenticated;
