import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrderForUser} from '@/src/modules/orders/infrastructure/supabase-orders';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const action=String(form.get('action')??'').toUpperCase();
  const location=String(form.get('handoff_location')??'').trim()||null;
  const scheduledRaw=String(form.get('scheduled_at')??'').trim();
  const scheduledAt=scheduledRaw?new Date(scheduledRaw).toISOString():null;
  const session=await getCurrentSession();
  if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login?next=/${locale}/orders/${id}`,request.url),303);
  const order=await getOrderForUser(id,session.user.id);
  if(!order)return NextResponse.redirect(new URL(`/${locale}/orders`,request.url),303);
  if(action==='SELLER_CONFIRM'&&order.sellerUserId!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=forbidden`,request.url),303);
  if(action==='BUYER_CONFIRM'&&order.buyerUserId!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=forbidden`,request.url),303);
  if(!['SCHEDULE','SELLER_CONFIRM','BUYER_CONFIRM'].includes(action))return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=invalid`,request.url),303);
  try{
    const admin=createSupabaseAdminClient();
    const {data,error}=await admin.rpc('advance_local_handoff',{p_order_id:id,p_actor_user_id:session.user.id,p_action:action,p_handoff_location:location,p_scheduled_at:scheduledAt});
    if(error)throw error;
    const completed=Array.isArray(data)&&Boolean(data[0]?.completed);
    return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=${completed?'completed':'updated'}`,request.url),303);
  }catch(error){console.error('handoff update failed',error);return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=error`,request.url),303);}
}
