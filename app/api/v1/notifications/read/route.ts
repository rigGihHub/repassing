import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

function safeReturnPath(value:string,locale:string){
  if(value.startsWith(`/${locale}/`)||value===`/${locale}`)return value;
  return `/${locale}/notifications`;
}

export async function POST(request:Request){
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const id=String(form.get('notification_id')??'');
  const markAll=String(form.get('mark_all')??'')==='1';
  const returnTo=safeReturnPath(String(form.get('return_to')??''),locale);
  const session=await getCurrentSession();
  if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login?next=/${locale}/notifications`,request.url),303);
  const supabase=await createSupabaseServerClient();
  let query=supabase.from('notification_inbox').update({read_at:new Date().toISOString()}).eq('user_id',session.user.id).is('read_at',null);
  if(!markAll&&id)query=query.eq('id',id);
  const {error}=await query;
  if(error)console.error('notification read update failed',error.message);
  return NextResponse.redirect(new URL(returnTo,request.url),303);
}
