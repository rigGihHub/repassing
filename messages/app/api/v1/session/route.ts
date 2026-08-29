import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {apiOk} from '@/src/shared/http/api-response';

export async function GET() {
  return apiOk(await getCurrentSession());
}
