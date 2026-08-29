import type {IdentityProvider} from '../ports/identity-provider';
import type {Session} from '../domain/user';

const previewSession: Session = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'preview@repassing.se',
    displayName: 'Repassing Preview',
    locale: 'sv-SE',
    countryCode: 'SE',
    status: 'ACTIVE'
  },
  authProvider: 'preview',
  issuedAt: '2026-08-29T00:00:00.000Z',
  preview: true
};

export class PreviewIdentityProvider implements IdentityProvider {
  async getSession(): Promise<Session> {
    return previewSession;
  }
}
