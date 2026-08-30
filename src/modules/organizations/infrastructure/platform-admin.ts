import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';
import type {Session} from '@/src/modules/identity/domain/user';

export function isPlatformAdmin(session: Session | null): boolean {
  if (!session) return false;
  const allowed = (process.env.REPASSING_PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(session.user.email.toLowerCase());
}

export async function getPendingOrganizationApplications() {
  const admin = createSupabaseAdminClient();
  const {data, error} = await admin
    .from('organization_applications')
    .select('id,applicant_user_id,organization_name,organization_slug,country_code,sport_codes,contact_name,contact_email,contact_phone,member_count_estimate,notes,status,created_at')
    .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
    .order('created_at', {ascending: true});
  if (error) throw error;
  return data ?? [];
}
