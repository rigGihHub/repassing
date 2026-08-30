-- Applied to Repassing Supabase project on 2026-08-29.
-- Canonical schema source: versioned SQL migrations.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.users (
  id uuid primary key default gen_random_uuid(), email text, display_name text,
  locale text not null default 'sv-SE', country_code text not null default 'SE',
  timezone text not null default 'Europe/Stockholm',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','DELETED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index users_email_unique_ci on public.users (lower(email)) where email is not null;

create table public.identity_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  provider text not null, provider_subject text not null, email text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider, provider_subject)
);
create index identity_accounts_user_id_idx on public.identity_accounts(user_id);

create table public.organizations (
  id uuid primary key default gen_random_uuid(), parent_id uuid references public.organizations(id) on delete restrict,
  organization_type text not null default 'CLUB' check (organization_type in ('FEDERATION','REGION','CLUB','SECTION','TEAM_ORG','PARTNER')),
  name text not null, slug text not null, country_code text not null default 'SE', default_locale text not null default 'sv-SE',
  default_currency text not null default 'SEK', timezone text not null default 'Europe/Stockholm',
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','SUSPENDED','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(parent_id, slug)
);
create unique index organizations_root_slug_unique on public.organizations(slug) where parent_id is null;
create index organizations_parent_id_idx on public.organizations(parent_id);
create index organizations_type_status_idx on public.organizations(organization_type,status);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MEMBER','MODERATOR','CLUB_ADMIN','ORG_OWNER')),
  status text not null default 'ACTIVE' check (status in ('INVITED','ACTIVE','SUSPENDED','LEFT')),
  joined_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,user_id)
);
create index organization_memberships_user_id_idx on public.organization_memberships(user_id);
create index organization_memberships_org_role_idx on public.organization_memberships(organization_id,role,status);

create table public.teams (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, slug text not null, sport_code text, birth_year int check (birth_year is null or birth_year between 1900 and 2100),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,slug)
);
create index teams_organization_id_idx on public.teams(organization_id);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MEMBER','TEAM_ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','LEFT')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id,user_id)
);
create index team_memberships_user_id_idx on public.team_memberships(user_id);

create table public.sports (id uuid primary key default gen_random_uuid(), code text not null unique, name_key text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')), created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories(id) on delete restrict,
  sport_id uuid references public.sports(id) on delete set null, code text not null unique, name_key text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')), created_at timestamptz not null default now());
create index categories_parent_id_idx on public.categories(parent_id); create index categories_sport_id_idx on public.categories(sport_id);
create table public.brands (id uuid primary key default gen_random_uuid(), name text not null, normalized_name text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')), created_at timestamptz not null default now());

create table public.listings (
  id uuid primary key default gen_random_uuid(), seller_user_id uuid not null references public.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null, team_id uuid references public.teams(id) on delete set null,
  sport_id uuid references public.sports(id) on delete set null, category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null, title text not null, description text, size_label text,
  condition text not null check (condition in ('NEW_WITH_TAGS','LIKE_NEW','GOOD','USED','WELL_USED')),
  price_minor bigint not null check (price_minor >= 0), currency text not null default 'SEK',
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','RESERVED','SOLD','COMPLETED','CANCELLED','REMOVED')),
  published_at timestamptz, reserved_at timestamptz, sold_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index listings_marketplace_idx on public.listings(status,organization_id,created_at desc);
create index listings_seller_user_id_idx on public.listings(seller_user_id); create index listings_team_id_idx on public.listings(team_id);
create index listings_category_id_idx on public.listings(category_id); create index listings_price_idx on public.listings(currency,price_minor);

create table public.listing_images (id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
  storage_bucket text not null, storage_path text not null, sort_order int not null default 0 check (sort_order >= 0), width int, height int,
  created_at timestamptz not null default now(), unique(listing_id,storage_path));
create index listing_images_listing_sort_idx on public.listing_images(listing_id,sort_order);
create table public.favorites (user_id uuid not null references public.users(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,listing_id)); create index favorites_listing_id_idx on public.favorites(listing_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null unique references public.listings(id) on delete restrict,
  buyer_user_id uuid not null references public.users(id) on delete restrict, seller_user_id uuid not null references public.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null, subtotal_minor bigint not null check (subtotal_minor >= 0),
  platform_fee_minor bigint not null default 0 check (platform_fee_minor >= 0), total_minor bigint not null check (total_minor >= 0), currency text not null,
  status text not null default 'PENDING' check (status in ('PENDING','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','COMPLETED','CANCELLED','REFUNDED','DISPUTED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (buyer_user_id <> seller_user_id), check (total_minor >= subtotal_minor)
);
create index orders_buyer_user_id_idx on public.orders(buyer_user_id,created_at desc); create index orders_seller_user_id_idx on public.orders(seller_user_id,created_at desc);

create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null, provider_payment_id text, amount_minor bigint not null check (amount_minor >= 0), currency text not null,
  status text not null default 'CREATED' check (status in ('CREATED','REQUIRES_ACTION','AUTHORIZED','CAPTURED','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED')),
  provider_payload jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index payments_provider_payment_unique on public.payments(provider,provider_payment_id) where provider_payment_id is not null;
create index payments_order_id_idx on public.payments(order_id);

create table public.fulfillments (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  method text not null default 'LOCAL_HANDOFF' check (method in ('LOCAL_HANDOFF','SHIPPING')),
  status text not null default 'PENDING' check (status in ('PENDING','SCHEDULED','HANDED_OVER','SHIPPED','DELIVERED','CANCELLED')),
  handoff_location text, scheduled_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_user_id uuid references public.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null, action text not null, entity_type text not null, entity_id uuid, metadata jsonb,
  created_at timestamptz not null default now());
create index audit_logs_org_created_idx on public.audit_logs(organization_id,created_at desc); create index audit_logs_actor_created_idx on public.audit_logs(actor_user_id,created_at desc);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger identity_accounts_set_updated_at before update on public.identity_accounts for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger organization_memberships_set_updated_at before update on public.organization_memberships for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger team_memberships_set_updated_at before update on public.team_memberships for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger fulfillments_set_updated_at before update on public.fulfillments for each row execute function public.set_updated_at();

alter table public.users enable row level security; alter table public.identity_accounts enable row level security;
alter table public.organizations enable row level security; alter table public.organization_memberships enable row level security;
alter table public.teams enable row level security; alter table public.team_memberships enable row level security;
alter table public.sports enable row level security; alter table public.categories enable row level security; alter table public.brands enable row level security;
alter table public.listings enable row level security; alter table public.listing_images enable row level security; alter table public.favorites enable row level security;
alter table public.orders enable row level security; alter table public.payments enable row level security; alter table public.fulfillments enable row level security; alter table public.audit_logs enable row level security;
