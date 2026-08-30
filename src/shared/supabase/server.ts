import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {runtimeConfig} from '@/src/shared/config/runtime';

export async function createSupabaseServerClient() {
  if (!runtimeConfig.supabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const cookieStore = await cookies();
  return createServerClient(
    runtimeConfig.supabase.url,
    runtimeConfig.supabase.publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always mutate cookies. Route handlers own
            // auth-changing flows; this client remains safe for read-only checks.
          }
        }
      }
    }
  );
}
