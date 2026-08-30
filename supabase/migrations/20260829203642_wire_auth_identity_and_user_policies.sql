create or replace function public.current_app_user_id()
returns uuid language sql stable security definer set search_path = pg_catalog, public as $$
  select ia.user_id from public.identity_accounts ia
  where ia.provider='supabase' and ia.provider_subject=auth.uid()::text limit 1
$$;
revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare app_user_id uuid;
begin
  select ia.user_id into app_user_id from public.identity_accounts ia where ia.provider='supabase' and ia.provider_subject=new.id::text;
  if app_user_id is null then
    insert into public.users(email,display_name,locale,country_code)
    values(new.email,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1),'Repassing member'),
      coalesce(new.raw_user_meta_data->>'locale','sv-SE'),coalesce(new.raw_user_meta_data->>'country_code','SE')) returning id into app_user_id;
    insert into public.identity_accounts(user_id,provider,provider_subject,email) values(app_user_id,'supabase',new.id::text,new.email);
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create policy users_read_self on public.users for select to authenticated using (id=public.current_app_user_id());
create policy users_update_self on public.users for update to authenticated using (id=public.current_app_user_id()) with check (id=public.current_app_user_id());
create policy identities_read_self on public.identity_accounts for select to authenticated using (user_id=public.current_app_user_id());
create policy org_memberships_read_self on public.organization_memberships for select to authenticated using (user_id=public.current_app_user_id());
create policy team_memberships_read_self on public.team_memberships for select to authenticated using (user_id=public.current_app_user_id());
create policy favorites_read_self on public.favorites for select to authenticated using (user_id=public.current_app_user_id());
create policy favorites_insert_self on public.favorites for insert to authenticated with check (user_id=public.current_app_user_id());
create policy favorites_delete_self on public.favorites for delete to authenticated using (user_id=public.current_app_user_id());
create policy listings_read_own on public.listings for select to authenticated using (seller_user_id=public.current_app_user_id());
create policy listings_insert_own on public.listings for insert to authenticated with check (seller_user_id=public.current_app_user_id());
create policy listings_update_own on public.listings for update to authenticated using (seller_user_id=public.current_app_user_id()) with check (seller_user_id=public.current_app_user_id());
create policy listings_delete_draft_own on public.listings for delete to authenticated using (seller_user_id=public.current_app_user_id() and status='DRAFT');
create policy orders_read_participant on public.orders for select to authenticated using (buyer_user_id=public.current_app_user_id() or seller_user_id=public.current_app_user_id());
create policy payments_read_order_participant on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.buyer_user_id=public.current_app_user_id() or o.seller_user_id=public.current_app_user_id())));
create policy fulfillments_read_order_participant on public.fulfillments for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.buyer_user_id=public.current_app_user_id() or o.seller_user_id=public.current_app_user_id())));

create index if not exists listings_organization_id_idx on public.listings(organization_id);
create index if not exists listings_sport_id_idx on public.listings(sport_id);
create index if not exists listings_brand_id_idx on public.listings(brand_id);
create index if not exists orders_organization_id_idx on public.orders(organization_id);
