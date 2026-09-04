-- Repassing v0.6.3.4
-- Make cancellation safe for the local-handoff flow and return eligible listings to market.
-- Cancellation is allowed before either party confirms handoff. Repeated cancellation is harmless.

create or replace function private.cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_fulfillment public.fulfillments%rowtype;
begin
  v_user_id := private.current_app_user_id();
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_user_id not in (v_order.buyer_user_id, v_order.seller_user_id) then
    raise exception 'not an order participant' using errcode = '42501';
  end if;

  -- Browser retries after a successful cancellation should not turn into errors.
  if v_order.status = 'CANCELLED' then
    return true;
  end if;

  if v_order.status not in ('PENDING','PAYMENT_PENDING','FULFILLMENT_PENDING') then
    raise exception 'order can no longer be cancelled here' using errcode = '23514';
  end if;

  select * into v_fulfillment
    from public.fulfillments
   where order_id = v_order.id
   for update;

  -- Once either party has confirmed the physical handoff, a simple cancellation
  -- is unsafe. That state needs a dispute/support path instead of reopening the item.
  if v_order.status = 'FULFILLMENT_PENDING'
     and found
     and (v_fulfillment.seller_confirmed_at is not null or v_fulfillment.buyer_confirmed_at is not null) then
    raise exception 'handoff already confirmed by a participant' using errcode = '23514';
  end if;

  update public.orders
     set status = 'CANCELLED', updated_at = now()
   where id = v_order.id;

  update public.fulfillments
     set status = 'CANCELLED', updated_at = now()
   where order_id = v_order.id
     and status in ('PENDING','SCHEDULED');

  -- Return the item to the marketplace only when this cancelled order is the
  -- only active transaction that could still own the reservation.
  update public.listings l
     set status = 'ACTIVE', reserved_at = null, updated_at = now()
   where l.id = v_order.listing_id
     and l.status = 'RESERVED'
     and coalesce(l.moderation_state,'CLEAR') = 'CLEAR'
     and not exists (
       select 1
         from public.orders other
        where other.listing_id = l.id
          and other.id <> v_order.id
          and other.status in ('PENDING','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','DISPUTED')
     );

  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,reason_code)
  values(v_order.id,v_order.status,'CANCELLED',v_user_id,'USER_CANCELLED');

  return true;
end;
$$;

revoke all on function private.cancel_pending_order(uuid) from public, anon;
grant execute on function private.cancel_pending_order(uuid) to authenticated;
