import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

export type ClubWorkspace = {
  organization: any;
  settings: any | null;
  teams: any[];
  checklist: any[];
  listings: any[];
  stats: {activeListings:number;soldProducts:number;reusedProducts:number;activeFamilies:number;gmvMinor:number;currency:string};
  membership: any | null;
};

export async function getClubWorkspace(slug:string, userId?:string):Promise<ClubWorkspace|null>{
  const supabase = createSupabaseAdminClient();
  const {data: organization} = await supabase.from('organizations').select('id,name,slug,organization_type,country_code,default_currency,default_locale,status').eq('slug',slug).eq('status','ACTIVE').maybeSingle();
  if(!organization) return null;
  const [{data:settings},{data:teams},{data:checklist},{data:listings},{data:orders},{data:reuse},{data:members}] = await Promise.all([
    supabase.from('organization_settings').select('*').eq('organization_id',organization.id).maybeSingle(),
    supabase.from('teams').select('id,name,slug,sport_code,birth_year,status').eq('organization_id',organization.id).eq('status','ACTIVE').order('name'),
    supabase.from('onboarding_checklist_items').select('id,item_key,label_key,sort_order,required,status,completed_at').eq('organization_id',organization.id).order('sort_order'),
    supabase.from('listings').select('id,title,price_minor,currency,size_label,condition,status,created_at,listing_images(public_url,sort_order)').eq('organization_id',organization.id).eq('status','ACTIVE').order('created_at',{ascending:false}).limit(24),
    supabase.from('orders').select('id,total_minor,currency,buyer_user_id,status').eq('organization_id',organization.id).in('status',['PAID','COMPLETED']),
    supabase.from('sustainability_events').select('quantity').eq('organization_id',organization.id).eq('event_type','ITEM_REUSED'),
    supabase.from('organization_memberships').select('user_id').eq('organization_id',organization.id).eq('status','ACTIVE')
  ]);
  let membership:any=null;
  if(userId){ const {data}=await supabase.from('organization_memberships').select('id,role,status').eq('organization_id',organization.id).eq('user_id',userId).eq('status','ACTIVE').maybeSingle(); membership=data; }
  const orderRows=orders??[];
  return {organization,settings,teams:teams??[],checklist:checklist??[],listings:listings??[],membership,stats:{
    activeListings:(listings??[]).length,
    soldProducts:orderRows.length,
    reusedProducts:(reuse??[]).reduce((sum:any,row:any)=>sum+Number(row.quantity||0),0),
    activeFamilies:new Set((members??[]).map((m:any)=>m.user_id)).size,
    gmvMinor:orderRows.reduce((sum:any,row:any)=>sum+Number(row.total_minor||0),0),
    currency:organization.default_currency
  }};
}

export async function requireClubAdmin(slug:string,userId:string){
  const admin=createSupabaseAdminClient();
  const {data:org,error}=await admin.from('organizations').select('id,name,slug,default_currency').eq('slug',slug).eq('status','ACTIVE').single();
  if(error||!org) throw new Error('Organization not found');
  const {data:membership}=await admin.from('organization_memberships').select('id,role,status').eq('organization_id',org.id).eq('user_id',userId).eq('status','ACTIVE').maybeSingle();
  if(!membership || !['OWNER','ADMIN'].includes(membership.role)) throw new Error('Forbidden');
  return {admin,org,membership};
}
