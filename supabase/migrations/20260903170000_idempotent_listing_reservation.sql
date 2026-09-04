-- Repassing v0.6.3.3
-- Make the reservation entry point idempotent for the same buyer/listing.
-- A repeated submit or browser retry returns the already-created active deal
-- instead of producing a misleading error. Competing buyers still fail safely.

create or replace function private.start_listing_reservation(
  p_listing_id uuid,
  p_message text default null
)
returns table(order_id uuid, conversation_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid;
  v_listing public.listings%rowtype;
  v_reservation_id uuid;
  v_order_id uuid;
  v_conversation_id uuid;
  v_message text;
begin
  v_user_id := private.current_app_user_id();
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- Serialize all attempts for the same listing. This keeps competing buyers safe.
  select * into v_listing
    from public.listings
   where id = p_listing_id
   for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.seller_user_id = v_user_id then
    raise exception 'seller cannot reserve own listing' using errcode = '23514';
  end if;

  -- Browser retries/double submits by the same buyer should be harmless.
  -- Return the existing in-progress deal instead of creating a duplicate.
  select o.id, c.id
    into v_order_id, v_conversation_id
    from public.orders o
    left join public.conversations c on c.order_id = o.id
   where o.listing_id = p_listing_id
     and o.buyer_user_id = v_user_id
     and o.status in ('PENDING','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','DISPUTED')
   order by o.created_at desc
   limit 1;

  if v_order_id is not null then
    if v_conversation_id is null then
      insert into public.conversations(listing_id, order_id, created_by_user_id, status)
      values(v_listing.id, v_order_id, v_user_id, 'OPEN')
      returning id into v_conversation_id;

      insert into public.conversation_participants(conversation_id, user_id)
      values(v_conversation_id, v_user_id), (v_conversation_id, v_listing.seller_user_id)
      on conflict do nothing;
    end if;

    return query select v_order_id, v_conversation_id;
    return;
  end if;

  if v_listing.status <> 'ACTIVE' or coalesce(v_listing.moderation_state, 'CLEAR') <> 'CLEAR' then
    raise exception 'listing is not available' using errcode = '23514';
  end if;

  v_reservation_id := private.reserve_listing(p_listing_id, v_user_id, 30);
  v_order_id := private.convert_reservation_to_order(
    v_reservation_id,
    v_listing.price_minor,
    0,
    v_listing.price_minor,
    v_listing.currency
  );

  insert into public.fulfillments(order_id, method, status)
  values(v_order_id, 'LOCAL_HANDOFF', 'PENDING')
  on conflict(order_id) do nothing;

  insert into public.conversations(listing_id, order_id, created_by_user_id, status)
  values(v_listing.id, v_order_id, v_user_id, 'OPEN')
  returning id into v_conversation_id;

  insert into public.conversation_participants(conversation_id, user_id)
  values(v_conversation_id, v_user_id), (v_conversation_id, v_listing.seller_user_id)
  on conflict do nothing;

  v_message := nullif(trim(coalesce(p_message, '')), '');
  if v_message is not null then
    if char_length(v_message) > 5000 then
      raise exception 'message too long' using errcode = '22001';
    end if;
    insert into public.messages(conversation_id, sender_user_id, body)
    values(v_conversation_id, v_user_id, v_message);
  end if;

  return query select v_order_id, v_conversation_id;
end;
$$;

revoke all on function private.start_listing_reservation(uuid,text) from public, anon;
grant execute on function private.start_listing_reservation(uuid,text) to authenticated;
