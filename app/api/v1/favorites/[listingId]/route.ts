import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

function safeRedirectPath(value: FormDataEntryValue | null, locale: string) {
  const path = typeof value === 'string' ? value : '';
  return path.startsWith('/') && !path.startsWith('//') ? path : `/${locale}`;
}

export async function POST(request: Request, {params}: {params: Promise<{listingId:string}>}) {
  const {listingId} = await params;
  const form = await request.formData();
  const locale = String(form.get('locale') ?? 'sv') === 'en' ? 'en' : 'sv';
  const redirectPath = safeRedirectPath(form.get('redirect_to'), locale);
  const session = await getCurrentSession();
  if (!session || session.preview) {
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set('next', redirectPath);
    return NextResponse.redirect(login, 303);
  }

  const supabase = await createSupabaseServerClient();
  const {data: listing} = await supabase.from('listings').select('id,status,moderation_state').eq('id', listingId).maybeSingle();
  if (!listing || listing.status !== 'ACTIVE' || listing.moderation_state !== 'CLEAR') {
    return NextResponse.redirect(new URL(redirectPath, request.url), 303);
  }

  const {data: existing, error: readError} = await supabase.from('favorites').select('listing_id').eq('user_id', session.user.id).eq('listing_id', listingId).maybeSingle();
  if (readError) {
    console.error('favorite read failed', readError.message);
    return NextResponse.redirect(new URL(redirectPath, request.url), 303);
  }
  if (existing) {
    const {error} = await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listingId);
    if (error) console.error('favorite delete failed', error.message);
  } else {
    const {error} = await supabase.from('favorites').insert({user_id: session.user.id, listing_id: listingId});
    if (error) console.error('favorite insert failed', error.message);
  }
  return NextResponse.redirect(new URL(redirectPath, request.url), 303);
}
