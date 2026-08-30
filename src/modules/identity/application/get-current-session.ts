import {PreviewIdentityProvider} from '../infrastructure/preview-identity-provider';
import {SupabaseIdentityProvider} from '../infrastructure/supabase-identity-provider';
import type {IdentityProvider} from '../ports/identity-provider';
import type {Session} from '../domain/user';
import {runtimeConfig} from '@/src/shared/config/runtime';

function getIdentityProvider(): IdentityProvider {
  if (runtimeConfig.authMode === 'supabase') return new SupabaseIdentityProvider();
  return new PreviewIdentityProvider();
}

export async function getCurrentSession(): Promise<Session | null> {
  return getIdentityProvider().getSession();
}
