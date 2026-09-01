import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export type OrganizationApplication = Readonly<{
  id: string;
  organizationName: string;
  contactEmail: string;
  countryCode: string;
  status: string;
  createdAt: string;
  decisionNote: string | null;
}>;

type OrganizationApplicationRow = {
  id: string;
  organization_name: string;
  contact_email: string;
  country_code: string;
  status: string;
  created_at: string;
  decision_note: string | null;
};

export async function listMyOrganizationApplications(): Promise<readonly OrganizationApplication[]> {
  const supabase = await createSupabaseServerClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return [];

  const {data, error} = await supabase
    .from('organization_applications')
    .select('id,organization_name,contact_email,country_code,status,created_at,decision_note')
    .eq('applicant_user_id', user.id)
    .order('created_at', {ascending: false});

  if (error) throw new Error(`Could not load organization applications: ${error.message}`);

  return ((data ?? []) as OrganizationApplicationRow[]).map((row) => ({
    id: row.id,
    organizationName: row.organization_name,
    contactEmail: row.contact_email,
    countryCode: row.country_code,
    status: row.status,
    createdAt: row.created_at,
    decisionNote: row.decision_note
  }));
}
