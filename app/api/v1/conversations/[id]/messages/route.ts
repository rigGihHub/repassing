import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

function safeReturnPath(locale:string,value:FormDataEntryValue|null,id:string){
  const fallback=`/${locale}/messages/${id}`;
  if(typeof value!=='string')return fallback;
  const path=value.trim();
  if(!path.startsWith(`/${locale}/`)||path.startsWith('//')||path.includes('://')||path.includes('\\'))return fallback;
  return path;
}

function withMessageResult(request:Request,path:string,result:'sent'|'error'){
  const url=new URL(path,request.url);
  if(path.includes('/orders/'))url.searchParams.set('message',result);
  else if(result==='error')url.searchParams.set('error','send');
  return url;
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const form=await request.formData();
  const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const returnTo=safeReturnPath(locale,form.get('return_to'),id);
  const body=String(form.get('body')??'').trim();
  const session=await getCurrentSession();
  if(!session||session.preview){
    const next=encodeURIComponent(returnTo);
    return NextResponse.redirect(new URL(`/${locale}/login?next=${next}`,request.url),303);
  }
  if(!body||body.length>5000)return NextResponse.redirect(withMessageResult(request,returnTo,'error'),303);
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc('send_conversation_message',{p_conversation_id:id,p_body:body});
  if(error){
    console.error('message send failed',error.message);
    return NextResponse.redirect(withMessageResult(request,returnTo,'error'),303);
  }
  return NextResponse.redirect(withMessageResult(request,returnTo,'sent'),303);
}
