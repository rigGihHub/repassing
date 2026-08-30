import {NextRequest, NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';
import {runtimeConfig} from '@/src/shared/config/runtime';

export async function POST(request: NextRequest) {
  if (runtimeConfig.authMode !== 'supabase') {
    return NextResponse.json({error: 'Production authentication is not enabled yet.'}, {status: 503});
  }

  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const locale = String(formData.get('locale') ?? 'sv') === 'en' ? 'en' : 'sv';
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=invalid-email`, request.url), 303);
  }

  const supabase = await createSupabaseServerClient();
  const callbackUrl = new URL('/api/v1/auth/callback', runtimeConfig.appUrl);
  callbackUrl.searchParams.set('locale', locale);

  const {error} = await supabase.auth.signInWithOtp({
    email,
    options: {emailRedirectTo: callbackUrl.toString(), shouldCreateUser: true}
  });

  if (error) return NextResponse.redirect(new URL(`/${locale}/login?error=send-failed`, request.url), 303);
  return NextResponse.redirect(new URL(`/${locale}/login?sent=1`, request.url), 303);
}
