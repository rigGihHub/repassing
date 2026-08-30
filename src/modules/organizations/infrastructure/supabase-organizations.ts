import {createSupabaseServerClient} from '@/src/shared/supabase/server';
import type {OrganizationMembershipView, OrganizationRole, MembershipStatus, OrganizationType} from '../domain/organization';

export async function findMembershipsForCurrentUser(): Promise<readonly OrganizationMembershipView[]> {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('organization_memberships')
    .select('id,role,status,organization:organizations(id,name,slug,organization_type,country_code,default_currency,default_locale),user_id')
    .eq('status', 'ACTIVE');
  if (error) throw new Error(`Could not load organization memberships: ${error.message}`);

  const {data: teams, error: teamError} = await supabase
    .from('team_memberships')
    .select('team:teams(name,organization_id)')
    .eq('status', 'ACTIVE');
  if (teamError) throw new Error(`Could not load team memberships: ${teamError.message}`);

  const teamNamesByOrg = new Map<string, string[]>();
  for (const row of teams ?? []) {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    if (!team) continue;
    const names = teamNamesByOrg.get(team.organization_id) ?? [];
    names.push(team.name);
    teamNamesByOrg.set(team.organization_id, names);
  }

  return (data ?? []).flatMap((membership: any) => {
    const organization = Array.isArray(membership.organization) ? membership.organization[0] : membership.organization;
    if (!organization) return [];
    return [{
      id: membership.id,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.organization_type as OrganizationType,
        countryCode: organization.country_code,
        defaultCurrency: organization.default_currency,
        locale: organization.default_locale
      },
      role: membership.role as OrganizationRole,
      status: membership.status as MembershipStatus,
      teamNames: teamNamesByOrg.get(organization.id) ?? []
    } satisfies OrganizationMembershipView];
  });
}

export async function findOrganizationBySlug(slug: string): Promise<OrganizationMembershipView | null> {
  const supabase = await createSupabaseServerClient();
  const {data: organization, error} = await supabase
    .from('organizations')
    .select('id,name,slug,organization_type,country_code,default_currency,default_locale')
    .eq('slug', slug)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (error || !organization) return null;
  return {
    id: `organization:${organization.id}`,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.organization_type as OrganizationType,
      countryCode: organization.country_code,
      defaultCurrency: organization.default_currency,
      locale: organization.default_locale
    },
    role: 'MEMBER',
    status: 'ACTIVE',
    teamNames: []
  };
}
