import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

type RpcErrorLike={code?:string|null;message?:string|null};

function cancelErrorCode(error:RpcErrorLike|null){
  const message=(error?.message??'').toLowerCase();
  if(message.includes('handoff already confirmed'))return 'handoff_started';
  if(message.includes('order can no longer be cancelled'))return 'state_changed';
  if(message.includes('not an order participant')||message.includes('authentication required'))return 'forbidden';
  if(message.includes('order not found'))return 'missing';
  return 'temporary';
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const session=await getCurrentSession();
  if(!session||session.preview){
    const login=new URL(`/${locale}/login`,request.url);
    login.searchParams.set('next',`/${locale}/orders/${id}`);
    return NextResponse.redirect(login,303);
  }
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc('cancel_pending_order',{p_order_id:id});
  if(error){
    const code=cancelErrorCode(error);
    console.error('order cancel failed',{code:error.code,message:error.message,uiCode:code});
    return NextResponse.redirect(new URL(`/${locale}/orders/${id}?error=${code}`,request.url),303);
  }
  return NextResponse.redirect(new URL(`/${locale}/orders/${id}?cancelled=1`,request.url),303);
}
