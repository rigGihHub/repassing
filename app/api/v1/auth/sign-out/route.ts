import {NextRequest, NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const locale = String(formData.get('locale') ?? 'sv') === 'en' ? 'en' : 'sv';
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(`/${locale}`, request.url), 303);
}
