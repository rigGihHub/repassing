import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrderForUser} from '@/src/modules/orders/infrastructure/supabase-orders';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

type RpcErrorLike={code?:string|null;message?:string|null};

function handoffErrorCode(error:RpcErrorLike|null){
  const message=(error?.message??'').toLowerCase();
  if(message.includes('only seller')||message.includes('only buyer')||message.includes('not an order participant')||message.includes('actor is not an order participant'))return 'forbidden';
  if(message.includes('order is not ready')||message.includes('order is not awaiting')||message.includes('already confirmed'))return 'state_changed';
  if(message.includes('order not found'))return 'missing';
  if(message.includes('unsupported handoff action')||message.includes('only local handoff'))return 'invalid';
  return 'temporary';
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const action=String(form.get('action')??'').toUpperCase();
  const location=String(form.get('handoff_location')??'').trim()||null;
  const scheduledRaw=String(form.get('scheduled_at')??'').trim();
  let scheduledAt:string|null=null;
  if(scheduledRaw){
    const parsed=new Date(scheduledRaw);
    if(Number.isNaN(parsed.getTime()))return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=invalid_time`,request.url),303);
    scheduledAt=parsed.toISOString();
  }
  const session=await getCurrentSession();
  if(!session||session.preview){
    const login=new URL(`/${locale}/login`,request.url);
    login.searchParams.set('next',`/${locale}/orders/${id}`);
    return NextResponse.redirect(login,303);
  }
  const order=await getOrderForUser(id,session.user.id);
  if(!order)return NextResponse.redirect(new URL(`/${locale}/orders?error=missing`,request.url),303);
  if(action==='SELLER_CONFIRM'&&order.sellerUserId!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=forbidden`,request.url),303);
  if(action==='BUYER_CONFIRM'&&order.buyerUserId!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=forbidden`,request.url),303);
  if(!['SCHEDULE','SELLER_CONFIRM','BUYER_CONFIRM'].includes(action))return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=invalid`,request.url),303);
  try{
    const admin=createSupabaseAdminClient();
    const {data,error}=await admin.rpc('advance_local_handoff',{p_order_id:id,p_actor_user_id:session.user.id,p_action:action,p_handoff_location:location,p_scheduled_at:scheduledAt});
    if(error)throw error;
    const completed=Array.isArray(data)&&Boolean(data[0]?.completed);
    return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=${completed?'completed':'updated'}`,request.url),303);
  }catch(error){
    const rpcError=error as RpcErrorLike;
    const code=handoffErrorCode(rpcError);
    console.error('handoff update failed',{code:rpcError.code,message:rpcError.message,uiCode:code});
    return NextResponse.redirect(new URL(`/${locale}/orders/${id}?handoff=${code}`,request.url),303);
  }
}
