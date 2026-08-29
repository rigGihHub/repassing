import type {Session} from '../domain/user';

export interface IdentityProvider {
  getSession(): Promise<Session | null>;
}
