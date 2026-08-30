create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_app_user_id()
returns uuid language sql stable security definer set search_path = pg_catalog, public, private as $$
  select ia.user_id from public.identity_accounts ia where ia.provider='supabase' and ia.provider_subject=auth.uid()::text limit 1
$$;
revoke all on function private.current_app_user_id() from public, anon;
grant execute on function private.current_app_user_id() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare app_user_id uuid;
begin
  select ia.user_id into app_user_id from public.identity_accounts ia where ia.provider='supabase' and ia.provider_subject=new.id::text;
  if app_user_id is null then
    insert into public.users(email,display_name,locale,country_code)
    values(new.email,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1),'Repassing member'),coalesce(new.raw_user_meta_data->>'locale','sv-SE'),coalesce(new.raw_user_meta_data->>'country_code','SE')) returning id into app_user_id;
    insert into public.identity_accounts(user_id,provider,provider_subject,email) values(app_user_id,'supabase',new.id::text,new.email);
  end if;
  return new;
end; $$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

alter policy users_read_self on public.users using (id=private.current_app_user_id());
alter policy users_update_self on public.users using (id=private.current_app_user_id()) with check (id=private.current_app_user_id());
alter policy identities_read_self on public.identity_accounts using (user_id=private.current_app_user_id());
alter policy org_memberships_read_self on public.organization_memberships using (user_id=private.current_app_user_id());
alter policy team_memberships_read_self on public.team_memberships using (user_id=private.current_app_user_id());
alter policy favorites_read_self on public.favorites using (user_id=private.current_app_user_id());
alter policy favorites_insert_self on public.favorites with check (user_id=private.current_app_user_id());
alter policy favorites_delete_self on public.favorites using (user_id=private.current_app_user_id());
alter policy listings_read_own on public.listings using (seller_user_id=private.current_app_user_id());
alter policy listings_insert_own on public.listings with check (seller_user_id=private.current_app_user_id());
alter policy listings_update_own on public.listings using (seller_user_id=private.current_app_user_id()) with check (seller_user_id=private.current_app_user_id());
alter policy listings_delete_draft_own on public.listings using (seller_user_id=private.current_app_user_id() and status='DRAFT');
alter policy orders_read_participant on public.orders using (buyer_user_id=private.current_app_user_id() or seller_user_id=private.current_app_user_id());
alter policy payments_read_order_participant on public.payments using (exists(select 1 from public.orders o where o.id=order_id and (o.buyer_user_id=private.current_app_user_id() or o.seller_user_id=private.current_app_user_id())));
alter policy fulfillments_read_order_participant on public.fulfillments using (exists(select 1 from public.orders o where o.id=order_id and (o.buyer_user_id=private.current_app_user_id() or o.seller_user_id=private.current_app_user_id())));

drop function if exists public.handle_new_auth_user();
drop function if exists public.current_app_user_id();
