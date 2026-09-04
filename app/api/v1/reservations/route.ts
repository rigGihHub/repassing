import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';
import {runtimeConfig} from '@/src/shared/config/runtime';

type RpcErrorLike={code?:string|null;message?:string|null};

function reservationErrorCode(error:RpcErrorLike|null){
  const message=(error?.message??'').toLowerCase();
  if(message.includes('seller cannot reserve own listing'))return 'own';
  if(message.includes('listing is not available')||message.includes('listing already reserved'))return 'unavailable';
  if(message.includes('listing not found'))return 'missing';
  if(message.includes('authentication required'))return 'session';
  if(message.includes('message too long')||error?.code==='22001')return 'message';
  return 'temporary';
}

export async function POST(request:Request){
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const listingId=String(form.get('listing_id')??'');
  const message=String(form.get('message')??'').trim();
  const session=await getCurrentSession();
  if(!session||session.preview){
    const u=new URL(`/${locale}/login`,request.url);
    u.searchParams.set('next',`/${locale}/listings/${listingId}`);
    return NextResponse.redirect(u,303);
  }
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.rpc('start_listing_reservation',{p_listing_id:listingId,p_message:message||null});
  if(error||!data?.[0]){
    const code=reservationErrorCode(error);
    console.error('reservation start failed',{code: error?.code,message:error?.message,uiCode:code});
    return NextResponse.redirect(new URL(`/${locale}/listings/${listingId}?error=${code}`,request.url),303);
  }
  const orderId=data[0].order_id as string;
  if(runtimeConfig.payments.mode!=='stripe'){
    try{
      const admin=createSupabaseAdminClient();
      const {error:handoffError}=await admin.rpc('activate_unpaid_local_handoff',{p_order_id:orderId,p_actor_user_id:session.user.id});
      if(handoffError)throw handoffError;
    }catch(handoffError){
      console.error('local handoff activation failed',handoffError);
      return NextResponse.redirect(new URL(`/${locale}/orders/${orderId}?handoff=activation_error`,request.url),303);
    }
  }
  return NextResponse.redirect(new URL(`/${locale}/orders/${orderId}?reserved=1`,request.url),303);
}
