import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';
export async function POST(request:Request){
  const form=await request.formData(); const locale=String(form.get('locale')??'sv')==='en'?'en':'sv'; const listingId=String(form.get('listing_id')??''); const message=String(form.get('message')??'').trim();
  const session=await getCurrentSession(); if(!session||session.preview){const u=new URL(`/${locale}/login`,request.url);u.searchParams.set('next',`/${locale}/listings/${listingId}`);return NextResponse.redirect(u,303);}
  const supabase=await createSupabaseServerClient(); const {data,error}=await supabase.rpc('start_listing_reservation',{p_listing_id:listingId,p_message:message||null});
  if(error||!data?.[0]){console.error('reservation start failed',error?.message);return NextResponse.redirect(new URL(`/${locale}/listings/${listingId}?error=reserve`,request.url),303);}
  return NextResponse.redirect(new URL(`/${locale}/orders/${data[0].order_id}?reserved=1`,request.url),303);
}
