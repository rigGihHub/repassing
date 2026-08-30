-- v0.5.3: in-app transaction notifications with idempotent event keys.

alter table public.notification_inbox
  add column if not exists event_key text;

create unique index if not exists notification_inbox_event_key_uidx
  on public.notification_inbox(event_key)
  where event_key is not null;

create or replace function private.guard_notification_inbox_user_update()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $$
begin
  if auth.role() = 'authenticated' then
    if new.user_id is distinct from old.user_id
       or new.type is distinct from old.type
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.entity_type is distinct from old.entity_type
       or new.entity_id is distinct from old.entity_id
       or new.action_url is distinct from old.action_url
       or new.event_key is distinct from old.event_key
       or new.created_at is distinct from old.created_at then
      raise exception 'notification content is immutable for end users';
    end if;
    if new.read_at is not null and new.read_at > now() + interval '5 minutes' then
      raise exception 'invalid read timestamp';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.create_localized_notification(
  p_user_id uuid,
  p_type text,
  p_title_sv text,
  p_title_en text,
  p_body_sv text,
  p_body_en text,
  p_entity_type text,
  p_entity_id uuid,
  p_action_url text,
  p_event_key text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_locale text;
  v_id uuid;
begin
  select lower(coalesce(u.preferred_locale,u.locale,'sv-SE'))
    into v_locale
    from public.users u
   where u.id=p_user_id;

  insert into public.notification_inbox(user_id,type,title,body,entity_type,entity_id,action_url,event_key)
  values(
    p_user_id,
    p_type,
    case when coalesce(v_locale,'sv-se') like 'sv%' then p_title_sv else p_title_en end,
    case when coalesce(v_locale,'sv-se') like 'sv%' then p_body_sv else p_body_en end,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_event_key
  )
  on conflict (event_key) where event_key is not null do update set event_key=excluded.event_key
  returning id into v_id;

  perform private.enqueue_outbox_event(
    'NOTIFICATION_CREATED',
    'NOTIFICATION',
    v_id,
    jsonb_build_object('notification_id',v_id,'user_id',p_user_id,'type',p_type),
    'notification:'||p_event_key
  );
  return v_id;
end;
$$;

revoke all on function private.create_localized_notification(uuid,text,text,text,text,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function private.create_localized_notification(uuid,text,text,text,text,text,text,uuid,text,text) to service_role;

create or replace function private.notify_order_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_title text;
begin
  select l.title into v_title from public.listings l where l.id=new.listing_id;

  if tg_op='INSERT' then
    perform private.create_localized_notification(new.seller_user_id,'RESERVATION_CREATED',
      'Din annons har reserverats','Your listing has been reserved',
      coalesce(v_title,'En vara')||' har reserverats.','A buyer reserved '||coalesce(v_title,'your item')||'.',
      'ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':reserved:seller');
    perform private.create_localized_notification(new.buyer_user_id,'RESERVATION_CREATED',
      'Varan är reserverad','Item reserved',
      'Slutför nästa steg för '||coalesce(v_title,'din vara')||'.','Complete the next step for '||coalesce(v_title,'your item')||'.',
      'ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':reserved:buyer');
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status='PAID' then
      perform private.create_localized_notification(new.buyer_user_id,'PAYMENT_CONFIRMED','Betalningen är klar','Payment confirmed','Betalningen för '||coalesce(v_title,'varan')||' är bekräftad.','Payment for '||coalesce(v_title,'the item')||' is confirmed.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':paid:buyer');
      perform private.create_localized_notification(new.seller_user_id,'PAYMENT_CONFIRMED','Betalning mottagen','Payment received','Köparen har betalat för '||coalesce(v_title,'varan')||'.','The buyer paid for '||coalesce(v_title,'the item')||'.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':paid:seller');
    elsif new.status='COMPLETED' then
      perform private.create_localized_notification(new.buyer_user_id,'ORDER_COMPLETED','Affären är klar','Order completed','Tack! Affären för '||coalesce(v_title,'varan')||' är slutförd.','Thanks! Your order for '||coalesce(v_title,'the item')||' is complete.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':completed:buyer');
      perform private.create_localized_notification(new.seller_user_id,'ORDER_COMPLETED','Affären är klar','Order completed','Försäljningen av '||coalesce(v_title,'varan')||' är slutförd.','The sale of '||coalesce(v_title,'the item')||' is complete.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':completed:seller');
    elsif new.status='CANCELLED' then
      perform private.create_localized_notification(new.buyer_user_id,'ORDER_CANCELLED','Reservationen avbröts','Reservation cancelled',coalesce(v_title,'Varan')||' är inte längre reserverad.','The reservation for '||coalesce(v_title,'the item')||' was cancelled.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':cancelled:buyer');
      perform private.create_localized_notification(new.seller_user_id,'ORDER_CANCELLED','Reservationen avbröts','Reservation cancelled',coalesce(v_title,'Varan')||' är aktiv igen om inget annat hindrar det.','The item can return to the marketplace when eligible.','ORDER',new.id,'/orders/'||new.id,'order:'||new.id||':cancelled:seller');
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.notify_message_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_participant record;
  v_order_id uuid;
  v_listing_title text;
begin
  select c.order_id,l.title into v_order_id,v_listing_title
  from public.conversations c
  left join public.listings l on l.id=c.listing_id
  where c.id=new.conversation_id;

  for v_participant in
    select cp.user_id from public.conversation_participants cp
    where cp.conversation_id=new.conversation_id and cp.user_id<>new.sender_user_id
  loop
    perform private.create_localized_notification(v_participant.user_id,'MESSAGE_CREATED',
      'Nytt meddelande','New message',
      'Nytt meddelande om '||coalesce(v_listing_title,'en affär')||'.','New message about '||coalesce(v_listing_title,'an order')||'.',
      'CONVERSATION',new.conversation_id,'/messages/'||new.conversation_id,'message:'||new.id||':'||v_participant.user_id);
  end loop;
  return new;
end;
$$;

create or replace function private.notify_handoff_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_order public.orders%rowtype;
  v_title text;
begin
  select * into v_order from public.orders where id=new.order_id;
  select l.title into v_title from public.listings l where l.id=v_order.listing_id;

  if new.scheduled_at is distinct from old.scheduled_at or new.handoff_location is distinct from old.handoff_location then
    perform private.create_localized_notification(v_order.buyer_user_id,'HANDOFF_SCHEDULED','Överlämningen är bokad','Handoff scheduled','Tid eller plats för '||coalesce(v_title,'varan')||' har uppdaterats.','Time or place for '||coalesce(v_title,'the item')||' was updated.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':schedule:buyer:'||coalesce(extract(epoch from new.updated_at)::bigint,0));
    perform private.create_localized_notification(v_order.seller_user_id,'HANDOFF_SCHEDULED','Överlämningen är bokad','Handoff scheduled','Tid eller plats för '||coalesce(v_title,'varan')||' har uppdaterats.','Time or place for '||coalesce(v_title,'the item')||' was updated.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':schedule:seller:'||coalesce(extract(epoch from new.updated_at)::bigint,0));
  end if;

  if new.seller_confirmed_at is not null and old.seller_confirmed_at is null then
    perform private.create_localized_notification(v_order.buyer_user_id,'HANDOFF_SELLER_CONFIRMED','Säljaren har lämnat över varan','Seller confirmed handoff','Bekräfta när du har fått '||coalesce(v_title,'varan')||'.','Confirm when you have received '||coalesce(v_title,'the item')||'.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':seller-confirmed');
  end if;
  if new.buyer_confirmed_at is not null and old.buyer_confirmed_at is null then
    perform private.create_localized_notification(v_order.seller_user_id,'HANDOFF_BUYER_CONFIRMED','Köparen har fått varan','Buyer confirmed receipt','Köparen har bekräftat '||coalesce(v_title,'varan')||'.','The buyer confirmed receipt of '||coalesce(v_title,'the item')||'.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':buyer-confirmed');
  end if;
  return new;
end;
$$;

revoke all on function private.notify_order_event() from public, anon, authenticated;
revoke all on function private.notify_message_event() from public, anon, authenticated;
revoke all on function private.notify_handoff_event() from public, anon, authenticated;

drop trigger if exists trg_orders_in_app_notifications on public.orders;
create trigger trg_orders_in_app_notifications
after insert or update of status on public.orders
for each row execute function private.notify_order_event();

drop trigger if exists trg_messages_in_app_notifications on public.messages;
create trigger trg_messages_in_app_notifications
after insert on public.messages
for each row execute function private.notify_message_event();

drop trigger if exists trg_fulfillments_in_app_notifications on public.fulfillments;
create trigger trg_fulfillments_in_app_notifications
after update of scheduled_at,handoff_location,seller_confirmed_at,buyer_confirmed_at on public.fulfillments
for each row execute function private.notify_handoff_event();
