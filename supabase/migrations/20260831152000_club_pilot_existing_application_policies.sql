-- Repassing v0.6.0.1 — use existing organization_applications schema
-- No table recreation. Adds only the permissions required by Club Pilot part 1.

grant select, insert on table public.organization_applications to authenticated;

drop policy if exists "organization_applications_insert_own" on public.organization_applications;
create policy "organization_applications_insert_own"
on public.organization_applications
for insert
to authenticated
with check (applicant_user_id = auth.uid());

drop policy if exists "organization_applications_select_own" on public.organization_applications;
create policy "organization_applications_select_own"
on public.organization_applications
for select
to authenticated
using (applicant_user_id = auth.uid());
