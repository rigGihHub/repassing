alter table public.payout_accounts
  add column if not exists transfers_enabled boolean not null default false,
  add column if not exists requirements_due_count integer not null default 0,
  add column if not exists future_requirements_due_count integer not null default 0,
  add column if not exists provider_api_version text,
  add column if not exists last_synced_at timestamptz;

do $$ begin
  alter table public.payout_accounts add constraint payout_accounts_requirements_due_nonnegative check (requirements_due_count >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.payout_accounts add constraint payout_accounts_future_requirements_due_nonnegative check (future_requirements_due_count >= 0);
exception when duplicate_object then null; end $$;

create index if not exists payout_accounts_user_provider_idx on public.payout_accounts(user_id, provider);
