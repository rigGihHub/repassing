-- v0.6.0 Pilot-ready club platform: server-managed invitation codes.
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  code text not null unique,
  role text not null default 'MEMBER' check (role in ('MEMBER','ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED')),
  max_uses integer not null default 100 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organization_invites_org_idx on public.organization_invites(organization_id,status);
create index if not exists organization_invites_code_idx on public.organization_invites(code) where status='ACTIVE';
alter table public.organization_invites enable row level security;
revoke all on table public.organization_invites from anon, authenticated;
comment on table public.organization_invites is 'Server-managed club invitation codes. Access is intentionally service-role only.';
