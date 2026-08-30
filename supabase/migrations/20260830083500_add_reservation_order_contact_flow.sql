create or replace function public.start_listing_reservation(p_listing_id uuid, p_message text default null)
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
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into v_listing from public.listings where id=p_listing_id for update;
  if not found then raise exception 'listing not found' using errcode='P0002'; end if;
  if v_listing.status <> 'ACTIVE' or coalesce(v_listing.moderation_state,'CLEAR') <> 'CLEAR' then raise exception 'listing is not available' using errcode='23514'; end if;
  if v_listing.seller_user_id=v_user_id then raise exception 'seller cannot reserve own listing' using errcode='23514'; end if;
  v_reservation_id := private.reserve_listing(p_listing_id,v_user_id,30);
  v_order_id := private.convert_reservation_to_order(v_reservation_id,v_listing.price_minor,0,v_listing.price_minor,v_listing.currency);
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
revoke all on function public.start_listing_reservation(uuid,text) from public;
grant execute on function public.start_listing_reservation(uuid,text) to authenticated;

create or replace function public.cancel_pending_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_user_id uuid; v_order public.orders%rowtype;
begin
  v_user_id:=private.current_app_user_id();
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found' using errcode='P0002'; end if;
  if v_user_id not in (v_order.buyer_user_id,v_order.seller_user_id) then raise exception 'not an order participant' using errcode='42501'; end if;
  if v_order.status not in ('PENDING','PAYMENT_PENDING') then raise exception 'order can no longer be cancelled here' using errcode='23514'; end if;
  update public.orders set status='CANCELLED',updated_at=now() where id=v_order.id;
  update public.fulfillments set status='CANCELLED',updated_at=now() where order_id=v_order.id and status in ('PENDING','SCHEDULED');
  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,reason_code) values(v_order.id,v_order.status,'CANCELLED',v_user_id,'USER_CANCELLED');
  return true;
end;$$;
revoke all on function public.cancel_pending_order(uuid) from public;
grant execute on function public.cancel_pending_order(uuid) to authenticated;

create or replace function public.send_conversation_message(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_user_id uuid; v_message_id uuid; v_body text;
begin
  v_user_id:=private.current_app_user_id();
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.conversation_participants where conversation_id=p_conversation_id and user_id=v_user_id) then raise exception 'not a conversation participant' using errcode='42501'; end if;
  v_body:=trim(coalesce(p_body,''));
  if char_length(v_body)<1 or char_length(v_body)>5000 then raise exception 'message must be between 1 and 5000 characters' using errcode='22023'; end if;
  insert into public.messages(conversation_id,sender_user_id,body) values(p_conversation_id,v_user_id,v_body) returning id into v_message_id;
  update public.conversations set updated_at=now() where id=p_conversation_id;
  return v_message_id;
end;$$;
revoke all on function public.send_conversation_message(uuid,text) from public;
grant execute on function public.send_conversation_message(uuid,text) to authenticated;
