import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';
const conditions=new Set(['NEW_WITH_TAGS','LIKE_NEW','GOOD','USED','WELL_USED']);
const statuses=new Set(['ACTIVE','RESERVED','SOLD']);
const optionalUuid=(value:FormDataEntryValue|null)=>{const text=typeof value==='string'?value.trim():'';return text||null;};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const session=await getCurrentSession();if(!session||session.preview)return NextResponse.redirect(new URL('/sv/login',request.url),303);
  const form=await request.formData();const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';const intent=String(form.get('intent')??'');const supabase=await createSupabaseServerClient();
  const {data:listing,error:readError}=await supabase.from('listings').select('id,seller_user_id,status').eq('id',id).maybeSingle();
  if(readError||!listing||listing.seller_user_id!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/profile`,request.url),303);
  if(intent==='remove'){
    const {error}=await supabase.from('listings').update({status:'REMOVED'}).eq('id',id).eq('seller_user_id',session.user.id);
    if(error){console.error('listing remove failed',error.message);return NextResponse.redirect(new URL(`/${locale}/listings/${id}?error=remove`,request.url),303);}return NextResponse.redirect(new URL(`/${locale}/profile?removed=1`,request.url),303);
  }
  if(intent==='status'){
    const status=String(form.get('status')??'');if(!statuses.has(status))return NextResponse.redirect(new URL(`/${locale}/listings/${id}?error=status`,request.url),303);
    const timestamps=status==='ACTIVE'?{reserved_at:null,sold_at:null}:status==='RESERVED'?{reserved_at:new Date().toISOString(),sold_at:null}:{sold_at:new Date().toISOString()};
    const {error}=await supabase.from('listings').update({status,...timestamps}).eq('id',id).eq('seller_user_id',session.user.id);
    if(error){console.error('listing status failed',error.message);return NextResponse.redirect(new URL(`/${locale}/listings/${id}?error=status`,request.url),303);}return NextResponse.redirect(new URL(`/${locale}/listings/${id}`,request.url),303);
  }
  if(intent==='update'){
    const title=String(form.get('title')??'').trim(),description=String(form.get('description')??'').trim(),sizeLabel=String(form.get('size_label')??'').trim(),condition=String(form.get('condition')??'GOOD'),price=Number(String(form.get('price')??'').replace(',','.')),currency=String(form.get('currency')??'SEK').toUpperCase();
    if(title.length<3||title.length>120||!conditions.has(condition)||!Number.isFinite(price)||price<0)return NextResponse.redirect(new URL(`/${locale}/listings/${id}/edit?error=validation`,request.url),303);
    const payload={organization_id:optionalUuid(form.get('organization_id')),team_id:optionalUuid(form.get('team_id')),sport_id:optionalUuid(form.get('sport_id')),category_id:optionalUuid(form.get('category_id')),brand_id:optionalUuid(form.get('brand_id')),title,description:description||null,size_label:sizeLabel||null,condition,price_minor:Math.round(price*100),currency};
    const {error}=await supabase.from('listings').update(payload).eq('id',id).eq('seller_user_id',session.user.id);
    if(error){console.error('listing update failed',error.message);return NextResponse.redirect(new URL(`/${locale}/listings/${id}/edit?error=save`,request.url),303);}return NextResponse.redirect(new URL(`/${locale}/listings/${id}`,request.url),303);
  }
  return NextResponse.redirect(new URL(`/${locale}/listings/${id}`,request.url),303);
}
