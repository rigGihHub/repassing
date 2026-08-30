import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {isPlatformAdmin} from '@/src/modules/organizations/infrastructure/platform-admin';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

const slugify=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60);

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getCurrentSession();
  if(!isPlatformAdmin(session)) return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  const f=await req.formData();
  const locale=String(f.get('locale')||'sv');
  const admin=createSupabaseAdminClient();
  const {data:application,error:applicationError}=await admin.from('organization_applications').select('*').eq('id',id).maybeSingle();
  if(applicationError||!application) return NextResponse.json({error:'Application not found'},{status:404});
  if(!['SUBMITTED','UNDER_REVIEW'].includes(application.status)) return NextResponse.json({error:'Application already decided'},{status:409});
  if(!application.applicant_user_id) return NextResponse.json({error:'Application has no linked Repassing user'},{status:400});
  const requestedSlug=slugify(String(f.get('slug')||application.organization_slug||application.organization_name));
  if(requestedSlug.length<2) return NextResponse.json({error:'Invalid slug'},{status:400});
  const {data:existing}=await admin.from('organizations').select('id').eq('slug',requestedSlug).maybeSingle();
  if(existing) return NextResponse.json({error:'Slug is already in use'},{status:409});
  const now=new Date().toISOString();
  const currency=application.country_code==='SE'?'SEK':'EUR';
  const localeCode=application.country_code==='SE'?'sv-SE':'en';
  const timezone=application.country_code==='SE'?'Europe/Stockholm':'UTC';
  const {data:organization,error:orgError}=await admin.from('organizations').insert({organization_type:'CLUB',name:application.organization_name,slug:requestedSlug,country_code:application.country_code,default_locale:localeCode,default_currency:currency,timezone,status:'ACTIVE'}).select('id,name,slug').single();
  if(orgError||!organization) return NextResponse.json({error:orgError?.message||'Could not create organization'},{status:400});
  try {
    const {error:membershipError}=await admin.from('organization_memberships').insert({organization_id:organization.id,user_id:application.applicant_user_id,role:'OWNER',status:'ACTIVE',joined_at:now});
    if(membershipError) throw membershipError;
    const {error:settingsError}=await admin.from('organization_settings').insert({organization_id:organization.id,marketplace_enabled:true,cross_club_discovery_enabled:false,local_handoff_enabled:true,shipping_enabled:false,messaging_enabled:true,moderation_required:false,default_market_region_code:application.country_code==='SE'?'SE':null,public_contact_email:application.contact_email,onboarding_state:'IN_PROGRESS'});
    if(settingsError) throw settingsError;
    const checklist=[
      ['CLUB_PROFILE','club_profile',10,true],
      ['CREATE_TEAM','create_team',20,true],
      ['INVITE_FAMILIES','invite_families',30,true],
      ['FIRST_LISTINGS','first_listings',40,true],
      ['PILOT_READY','pilot_ready',50,true]
    ].map(([item_key,label_key,sort_order,required])=>({organization_id:organization.id,item_key,label_key,sort_order,required,status:'PENDING'}));
    const {error:checklistError}=await admin.from('onboarding_checklist_items').insert(checklist);
    if(checklistError) throw checklistError;
    const {error:applicationUpdateError}=await admin.from('organization_applications').update({status:'APPROVED',organization_slug:requestedSlug,approved_organization_id:organization.id,decision_note:String(f.get('decision_note')||'').trim()||null,reviewed_by_user_id:session!.user.id,reviewed_at:now}).eq('id',application.id);
    if(applicationUpdateError) throw applicationUpdateError;
    await admin.from('analytics_events').insert({event_name:'ORGANIZATION_APPLICATION_APPROVED',user_id:application.applicant_user_id,organization_id:organization.id,source:'platform_admin',properties:{application_id:application.id,slug:requestedSlug},privacy_class:'INTERNAL'});
  } catch (error:any) {
    await admin.from('organizations').delete().eq('id',organization.id);
    return NextResponse.json({error:error?.message||'Approval failed'},{status:400});
  }
  return NextResponse.redirect(new URL(`/${locale}/platform/clubs?approved=${encodeURIComponent(organization.slug)}`,req.url),303);
}
