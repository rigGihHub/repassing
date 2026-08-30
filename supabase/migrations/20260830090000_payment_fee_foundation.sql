alter table public.fee_rules
  add column if not exists fee_payer text not null default 'SELLER';

do $$ begin
  alter table public.fee_rules add constraint fee_rules_fee_payer_check check (fee_payer in ('SELLER','BUYER'));
exception when duplicate_object then null; end $$;

alter table public.orders
  add column if not exists fee_rule_id uuid references public.fee_rules(id),
  add column if not exists buyer_fee_minor bigint not null default 0,
  add column if not exists seller_fee_minor bigint not null default 0,
  add column if not exists seller_net_minor bigint;

update public.orders
set buyer_fee_minor = greatest(total_minor - subtotal_minor, 0),
    seller_fee_minor = case when total_minor = subtotal_minor then platform_fee_minor else 0 end,
    seller_net_minor = greatest(subtotal_minor - case when total_minor = subtotal_minor then platform_fee_minor else 0 end, 0)
where seller_net_minor is null;

alter table public.orders alter column seller_net_minor set not null;

do $$ begin
  alter table public.orders add constraint orders_buyer_fee_nonnegative check (buyer_fee_minor >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_seller_fee_nonnegative check (seller_fee_minor >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_seller_net_nonnegative check (seller_net_minor >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_fee_breakdown_consistent check (
    platform_fee_minor = buyer_fee_minor + seller_fee_minor
    and total_minor = subtotal_minor + buyer_fee_minor
    and seller_net_minor = subtotal_minor - seller_fee_minor
  );
exception when duplicate_object then null; end $$;

create index if not exists orders_fee_rule_id_idx on public.orders(fee_rule_id);

alter table public.payments
  add column if not exists idempotency_key text,
  add column if not exists checkout_expires_at timestamptz;
create unique index if not exists payments_provider_idempotency_uidx on public.payments(provider,idempotency_key) where idempotency_key is not null;

insert into public.fee_rules(currency,fee_type,percentage_bps,fixed_minor,min_fee_minor,priority,status,fee_payer)
select 'SEK','PERCENTAGE',300,0,100,100,'ACTIVE','SELLER'
where not exists (
  select 1 from public.fee_rules
  where organization_id is null and country_code is null and currency='SEK' and status='ACTIVE'
);

create or replace function private.calculate_order_fee(
  p_organization_id uuid,
  p_country_code text,
  p_currency text,
  p_subtotal_minor bigint
)
returns table(
  fee_rule_id uuid,
  fee_payer text,
  platform_fee_minor bigint,
  buyer_fee_minor bigint,
  seller_fee_minor bigint,
  total_minor bigint,
  seller_net_minor bigint
)
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare
  v_rule public.fee_rules%rowtype;
  v_fee bigint := 0;
begin
  if p_subtotal_minor < 0 then raise exception 'subtotal must be nonnegative' using errcode='22023'; end if;

  select * into v_rule
  from public.fee_rules r
  where r.status='ACTIVE'
    and r.currency=upper(p_currency)
    and r.active_from<=now()
    and (r.active_until is null or r.active_until>now())
    and (r.organization_id is null or r.organization_id=p_organization_id)
    and (r.country_code is null or r.country_code=upper(p_country_code))
  order by
    case when r.organization_id=p_organization_id then 0 else 1 end,
    case when r.country_code=upper(p_country_code) then 0 else 1 end,
    r.priority asc,
    r.active_from desc
  limit 1;

  if found then
    v_fee := case v_rule.fee_type
      when 'PERCENTAGE' then round((p_subtotal_minor::numeric * v_rule.percentage_bps::numeric) / 10000)::bigint
      when 'FIXED' then v_rule.fixed_minor
      when 'PERCENTAGE_PLUS_FIXED' then round((p_subtotal_minor::numeric * v_rule.percentage_bps::numeric) / 10000)::bigint + v_rule.fixed_minor
      else 0 end;
    if v_rule.min_fee_minor is not null then v_fee := greatest(v_fee,v_rule.min_fee_minor); end if;
    if v_rule.max_fee_minor is not null then v_fee := least(v_fee,v_rule.max_fee_minor); end if;
    v_fee := least(v_fee,p_subtotal_minor);
  end if;

  return query select
    v_rule.id,
    coalesce(v_rule.fee_payer,'SELLER'),
    v_fee,
    case when coalesce(v_rule.fee_payer,'SELLER')='BUYER' then v_fee else 0 end,
    case when coalesce(v_rule.fee_payer,'SELLER')='SELLER' then v_fee else 0 end,
    p_subtotal_minor + case when coalesce(v_rule.fee_payer,'SELLER')='BUYER' then v_fee else 0 end,
    p_subtotal_minor - case when coalesce(v_rule.fee_payer,'SELLER')='SELLER' then v_fee else 0 end;
end;$$;

revoke all on function private.calculate_order_fee(uuid,text,text,bigint) from public;
grant execute on function private.calculate_order_fee(uuid,text,text,bigint) to authenticated;

create or replace function private.start_listing_reservation(p_listing_id uuid, p_message text default null)
returns table(order_id uuid, conversation_id uuid)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  v_user_id uuid;
  v_listing public.listings%rowtype;
  v_reservation_id uuid;
  v_order_id uuid;
  v_conversation_id uuid;
  v_message text;
  v_country text;
  v_fee record;
begin
  v_user_id:=private.current_app_user_id();
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;

  select * into v_listing from public.listings where id=p_listing_id for update;
  if not found then raise exception 'listing not found' using errcode='P0002'; end if;
  if v_listing.status<>'ACTIVE' or coalesce(v_listing.moderation_state,'CLEAR')<>'CLEAR' then raise exception 'listing is not available' using errcode='23514'; end if;
  if v_listing.seller_user_id=v_user_id then raise exception 'seller cannot reserve own listing' using errcode='23514'; end if;

  select coalesce(o.country_code,'SE') into v_country from public.organizations o where o.id=v_listing.organization_id;
  v_country:=coalesce(v_country,'SE');
  select * into v_fee from private.calculate_order_fee(v_listing.organization_id,v_country,v_listing.currency,v_listing.price_minor);

  v_reservation_id:=private.reserve_listing(p_listing_id,v_user_id,30);

  insert into public.orders(
    listing_id,buyer_user_id,seller_user_id,organization_id,subtotal_minor,
    platform_fee_minor,total_minor,currency,status,fee_rule_id,buyer_fee_minor,seller_fee_minor,seller_net_minor
  ) values(
    v_listing.id,v_user_id,v_listing.seller_user_id,v_listing.organization_id,v_listing.price_minor,
    v_fee.platform_fee_minor,v_fee.total_minor,upper(v_listing.currency),'PENDING',v_fee.fee_rule_id,
    v_fee.buyer_fee_minor,v_fee.seller_fee_minor,v_fee.seller_net_minor
  ) returning id into v_order_id;

  update public.listing_reservations set status='CONVERTED',converted_order_id=v_order_id where id=v_reservation_id;
  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,reason_code)
  values(v_order_id,null,'PENDING',v_user_id,'RESERVATION_CONVERTED');

  insert into public.fulfillments(order_id,method,status) values(v_order_id,'LOCAL_HANDOFF','PENDING') on conflict(order_id) do nothing;
  insert into public.conversations(listing_id,order_id,created_by_user_id,status) values(v_listing.id,v_order_id,v_user_id,'OPEN') returning id into v_conversation_id;
  insert into public.conversation_participants(conversation_id,user_id) values(v_conversation_id,v_user_id),(v_conversation_id,v_listing.seller_user_id) on conflict do nothing;

  v_message:=nullif(trim(coalesce(p_message,'')),'');
  if v_message is not null then
    if char_length(v_message)>5000 then raise exception 'message too long' using errcode='22001'; end if;
    insert into public.messages(conversation_id,sender_user_id,body) values(v_conversation_id,v_user_id,v_message);
  end if;
  return query select v_order_id,v_conversation_id;
end;$$;
