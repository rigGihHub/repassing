-- Repassing v0.6.3.0
-- Allows the server to move a newly-created reservation directly into local handoff
-- when live Stripe payments are disabled. The function is service-role only.

create or replace function public.activate_unpaid_local_handoff(
  p_order_id uuid,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if p_actor_user_id is null or p_actor_user_id <> v_order.buyer_user_id then
    raise exception 'only the buyer may activate local handoff' using errcode = '42501';
  end if;

  if v_order.status not in ('PENDING','PAYMENT_PENDING') then
    raise exception 'order is not awaiting activation' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.fulfillments f
     where f.order_id = v_order.id and f.method = 'LOCAL_HANDOFF'
  ) then
    raise exception 'local handoff fulfillment missing' using errcode = '23514';
  end if;

  update public.orders
     set status = 'FULFILLMENT_PENDING', updated_at = now()
   where id = v_order.id;

  update public.fulfillments
     set status = case when status = 'PENDING' then 'PENDING' else status end, updated_at = now()
   where order_id = v_order.id;

  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,reason_code)
  values(v_order.id,v_order.status,'FULFILLMENT_PENDING',p_actor_user_id,'LOCAL_HANDOFF_NO_PAYMENT');

  return true;
end;
$$;

revoke all on function public.activate_unpaid_local_handoff(uuid,uuid) from public, anon, authenticated;
grant execute on function public.activate_unpaid_local_handoff(uuid,uuid) to service_role;
