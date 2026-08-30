import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {apiOk, apiUnauthorized} from '@/src/shared/http/api-response';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return apiUnauthorized();
  return apiOk(await getMembershipsForUser(session.user.id));
}
