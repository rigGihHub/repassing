-- Repassing v0.5.2: two-sided local handoff confirmation and automatic reuse event.

alter table public.fulfillments
  add column if not exists seller_confirmed_at timestamptz,
  add column if not exists buyer_confirmed_at timestamptz;

create unique index if not exists sustainability_events_one_reuse_per_order_idx
  on public.sustainability_events(order_id, event_type)
  where order_id is not null and event_type = 'ITEM_REUSED';

create or replace function public.advance_local_handoff(
  p_order_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_handoff_location text default null,
  p_scheduled_at timestamptz default null
)
returns table(order_status text, fulfillment_status text, completed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_order public.orders%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_action text := upper(trim(coalesce(p_action,'')));
  v_now timestamptz := now();
begin
  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found' using errcode = 'no_data_found';
  end if;

  if p_actor_user_id is null or p_actor_user_id not in (v_order.buyer_user_id, v_order.seller_user_id) then
    raise exception 'actor is not an order participant' using errcode = 'insufficient_privilege';
  end if;

  select * into v_fulfillment
    from public.fulfillments
   where order_id = p_order_id
   for update;

  if not found then
    insert into public.fulfillments(order_id, method, status)
    values (p_order_id, 'LOCAL_HANDOFF', 'PENDING')
    returning * into v_fulfillment;
  end if;

  if v_fulfillment.method <> 'LOCAL_HANDOFF' then
    raise exception 'only local handoff can use this flow' using errcode = 'check_violation';
  end if;

  if v_action = 'SCHEDULE' then
    if v_order.status not in ('PAID','FULFILLMENT_PENDING') then
      raise exception 'order is not ready for handoff scheduling' using errcode = 'check_violation';
    end if;

    update public.fulfillments
       set status = 'SCHEDULED',
           handoff_location = nullif(trim(p_handoff_location), ''),
           scheduled_at = p_scheduled_at,
           updated_at = v_now
     where order_id = p_order_id
     returning * into v_fulfillment;

    if v_order.status = 'PAID' then
      update public.orders set status = 'FULFILLMENT_PENDING' where id = p_order_id returning * into v_order;
    end if;

  elsif v_action = 'SELLER_CONFIRM' then
    if p_actor_user_id <> v_order.seller_user_id then
      raise exception 'only seller can confirm handoff' using errcode = 'insufficient_privilege';
    end if;
    if v_order.status <> 'FULFILLMENT_PENDING' then
      raise exception 'order is not awaiting handoff' using errcode = 'check_violation';
    end if;

    update public.fulfillments
       set seller_confirmed_at = coalesce(seller_confirmed_at, v_now),
           status = 'HANDED_OVER',
           completed_at = case when buyer_confirmed_at is not null then coalesce(completed_at, v_now) else completed_at end,
           updated_at = v_now
     where order_id = p_order_id
     returning * into v_fulfillment;

  elsif v_action = 'BUYER_CONFIRM' then
    if p_actor_user_id <> v_order.buyer_user_id then
      raise exception 'only buyer can confirm receipt' using errcode = 'insufficient_privilege';
    end if;
    if v_order.status <> 'FULFILLMENT_PENDING' then
      raise exception 'order is not awaiting handoff' using errcode = 'check_violation';
    end if;

    update public.fulfillments
       set buyer_confirmed_at = coalesce(buyer_confirmed_at, v_now),
           completed_at = case when seller_confirmed_at is not null then coalesce(completed_at, v_now) else completed_at end,
           updated_at = v_now
     where order_id = p_order_id
     returning * into v_fulfillment;
  else
    raise exception 'unsupported handoff action' using errcode = '22023';
  end if;

  if v_fulfillment.seller_confirmed_at is not null and v_fulfillment.buyer_confirmed_at is not null then
    update public.fulfillments
       set status = 'HANDED_OVER', completed_at = coalesce(completed_at, v_now), updated_at = v_now
     where order_id = p_order_id
     returning * into v_fulfillment;

    if v_order.status = 'FULFILLMENT_PENDING' then
      update public.orders set status = 'COMPLETED' where id = p_order_id returning * into v_order;
    end if;

    insert into public.sustainability_events(
      organization_id, user_id, listing_id, order_id, event_type, quantity, occurred_at
    )
    values (
      v_order.organization_id, v_order.buyer_user_id, v_order.listing_id, v_order.id, 'ITEM_REUSED', 1, v_now
    )
    on conflict (order_id, event_type) where order_id is not null and event_type = 'ITEM_REUSED' do nothing;
  end if;

  return query
  select v_order.status,
         v_fulfillment.status,
         (v_order.status = 'COMPLETED');
end;
$$;

revoke all on function public.advance_local_handoff(uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.advance_local_handoff(uuid,uuid,text,text,timestamptz) to service_role;
