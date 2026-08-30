import type {IdentityProvider} from '../ports/identity-provider';
import type {Session, UserStatus} from '../domain/user';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';
import {runtimeConfig} from '@/src/shared/config/runtime';

export class SupabaseIdentityProvider implements IdentityProvider {
  async getSession(): Promise<Session | null> {
    const supabase = await createSupabaseServerClient();
    const {data: authData, error: authError} = await supabase.auth.getUser();
    if (authError || !authData.user) return null;

    if (runtimeConfig.dataMode !== 'supabase') {
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email ?? '',
          displayName: authData.user.user_metadata?.display_name ?? authData.user.email?.split('@')[0] ?? 'Repassing member',
          locale: authData.user.user_metadata?.locale ?? 'sv-SE',
          countryCode: authData.user.user_metadata?.country_code ?? 'SE',
          status: 'ACTIVE'
        },
        authProvider: 'supabase',
        issuedAt: new Date().toISOString(),
        preview: false
      };
    }

    const {data: identity, error: identityError} = await supabase
      .from('identity_accounts')
      .select('user_id')
      .eq('provider', 'supabase')
      .eq('provider_subject', authData.user.id)
      .maybeSingle();
    if (identityError || !identity) return null;

    const {data: user, error: userError} = await supabase
      .from('users')
      .select('id,email,display_name,locale,country_code,status')
      .eq('id', identity.user_id)
      .single();
    if (userError || !user) return null;

    return {
      user: {
        id: user.id,
        email: user.email ?? authData.user.email ?? '',
        displayName: user.display_name ?? authData.user.email?.split('@')[0] ?? 'Repassing member',
        locale: user.locale,
        countryCode: user.country_code,
        status: user.status as UserStatus
      },
      authProvider: 'supabase',
      issuedAt: new Date().toISOString(),
      preview: false
    };
  }
}
