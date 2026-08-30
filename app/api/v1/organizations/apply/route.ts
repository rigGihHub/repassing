import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';
export async function POST(req:Request){
  const session=await getCurrentSession(); if(!session) return NextResponse.json({error:'Unauthorized'},{status:401});
  const f=await req.formData(); const name=String(f.get('organization_name')||'').trim(); const email=String(f.get('contact_email')||'').trim();
  if(name.length<2||!email.includes('@')) return NextResponse.json({error:'Invalid application'},{status:400});
  const admin=createSupabaseAdminClient(); const {error}=await admin.from('organization_applications').insert({applicant_user_id:session.user.id,organization_name:name,country_code:String(f.get('country_code')||'SE').toUpperCase().slice(0,2),sport_codes:String(f.get('sports')||'football').split(',').map(x=>x.trim()).filter(Boolean),contact_name:String(f.get('contact_name')||session.user.displayName).trim(),contact_email:email,contact_phone:String(f.get('contact_phone')||'').trim()||null,member_count_estimate:Number(f.get('member_count')||0)||null,notes:String(f.get('notes')||'').trim()||null,status:'SUBMITTED'});
  if(error) return NextResponse.json({error:error.message},{status:400});
  const locale=String(f.get('locale')||'sv'); return NextResponse.redirect(new URL(`/${locale}/clubs?applied=1`,req.url),303);
}
