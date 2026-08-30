import {NextRequest, NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'sv';
  if (!code) return NextResponse.redirect(new URL(`/${locale}/login?error=missing-code`, request.url));

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/${locale}/login?error=callback-failed`, request.url));

  // public.users + identity_accounts are bootstrapped by a hardened database trigger
  // on auth.users. The application never needs a service-role key for onboarding.
  return NextResponse.redirect(new URL(`/${locale}/profile`, request.url));
}
