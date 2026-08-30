-- v0.6.1 Pilot onboarding & club admin 2.0
-- Adds traceable application approval and optional team-scoped invitations.

alter table public.organization_applications
  add column if not exists approved_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists decision_note text;

alter table public.organization_invites
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

create index if not exists organization_invites_team_idx
  on public.organization_invites(team_id, status)
  where team_id is not null;

comment on column public.organization_applications.approved_organization_id is 'Organization created from an approved application.';
comment on column public.organization_invites.team_id is 'Optional team scope. When set, joining also creates an ACTIVE team membership.';
