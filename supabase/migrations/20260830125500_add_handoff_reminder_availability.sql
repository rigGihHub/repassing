-- v0.5.3 follow-up: make in-app notifications time-aware and schedule handoff reminders.

alter table public.notification_inbox
  add column if not exists available_at timestamptz not null default now();

create index if not exists notification_inbox_user_available_idx
  on public.notification_inbox(user_id,available_at desc);

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
       or new.available_at is distinct from old.available_at
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

create or replace function private.create_scheduled_localized_notification(
  p_user_id uuid,
  p_type text,
  p_title_sv text,
  p_title_en text,
  p_body_sv text,
  p_body_en text,
  p_entity_type text,
  p_entity_id uuid,
  p_action_url text,
  p_event_key text,
  p_available_at timestamptz
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
  select lower(coalesce(u.preferred_locale,u.locale,'sv-SE')) into v_locale from public.users u where u.id=p_user_id;
  insert into public.notification_inbox(user_id,type,title,body,entity_type,entity_id,action_url,event_key,available_at)
  values(p_user_id,p_type,
    case when coalesce(v_locale,'sv-se') like 'sv%' then p_title_sv else p_title_en end,
    case when coalesce(v_locale,'sv-se') like 'sv%' then p_body_sv else p_body_en end,
    p_entity_type,p_entity_id,p_action_url,p_event_key,coalesce(p_available_at,now()))
  on conflict (event_key) where event_key is not null do update
    set available_at=excluded.available_at,title=excluded.title,body=excluded.body
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.create_scheduled_localized_notification(uuid,text,text,text,text,text,text,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function private.create_scheduled_localized_notification(uuid,text,text,text,text,text,text,uuid,text,text,timestamptz) to service_role;

create or replace function private.notify_handoff_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_order public.orders%rowtype;
  v_title text;
  v_reminder_at timestamptz;
begin
  select * into v_order from public.orders where id=new.order_id;
  select l.title into v_title from public.listings l where l.id=v_order.listing_id;

  if new.scheduled_at is distinct from old.scheduled_at or new.handoff_location is distinct from old.handoff_location then
    perform private.create_localized_notification(v_order.buyer_user_id,'HANDOFF_SCHEDULED','Överlämningen är bokad','Handoff scheduled','Tid eller plats för '||coalesce(v_title,'varan')||' har uppdaterats.','Time or place for '||coalesce(v_title,'the item')||' was updated.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':schedule:buyer:'||coalesce(extract(epoch from new.updated_at)::bigint,0));
    perform private.create_localized_notification(v_order.seller_user_id,'HANDOFF_SCHEDULED','Överlämningen är bokad','Handoff scheduled','Tid eller plats för '||coalesce(v_title,'varan')||' har uppdaterats.','Time or place for '||coalesce(v_title,'the item')||' was updated.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':schedule:seller:'||coalesce(extract(epoch from new.updated_at)::bigint,0));

    delete from public.notification_inbox
      where event_key in ('handoff:'||new.id||':reminder:buyer','handoff:'||new.id||':reminder:seller')
        and read_at is null;

    if new.scheduled_at is not null and new.scheduled_at>now() then
      v_reminder_at:=greatest(new.scheduled_at-interval '2 hours',now());
      perform private.create_scheduled_localized_notification(v_order.buyer_user_id,'HANDOFF_REMINDER','Överlämning snart','Handoff coming up','Snart är det dags att hämta '||coalesce(v_title,'varan')||'.','It is almost time to pick up '||coalesce(v_title,'the item')||'.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':reminder:buyer',v_reminder_at);
      perform private.create_scheduled_localized_notification(v_order.seller_user_id,'HANDOFF_REMINDER','Överlämning snart','Handoff coming up','Snart är det dags att lämna över '||coalesce(v_title,'varan')||'.','It is almost time to hand over '||coalesce(v_title,'the item')||'.','ORDER',v_order.id,'/orders/'||v_order.id,'handoff:'||new.id||':reminder:seller',v_reminder_at);
    end if;
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
