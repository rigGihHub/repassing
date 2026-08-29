import {PreviewIdentityProvider} from '../infrastructure/preview-identity-provider';
import type {IdentityProvider} from '../ports/identity-provider';
import type {Session} from '../domain/user';

// The application layer depends only on the IdentityProvider port. A managed
// identity adapter can replace PreviewIdentityProvider without touching UI or domain code.
const provider: IdentityProvider = new PreviewIdentityProvider();

export async function getCurrentSession(): Promise<Session | null> {
  return provider.getSession();
}
