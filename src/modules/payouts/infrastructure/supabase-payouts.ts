import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

export type SellerPayoutAccount={id:string;providerAccountId:string;onboardingStatus:string;transfersEnabled:boolean;payoutsEnabled:boolean;requirementsDueCount:number;futureRequirementsDueCount:number;lastSyncedAt:string|null;providerApiVersion:string|null};

export async function getSellerStripePayoutAccount(userId:string):Promise<SellerPayoutAccount|null>{
  const admin=createSupabaseAdminClient();
  const {data,error}=await admin.from('payout_accounts').select('id,provider_account_id,onboarding_status,transfers_enabled,payouts_enabled,requirements_due_count,future_requirements_due_count,last_synced_at,provider_api_version').eq('user_id',userId).eq('provider','stripe').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error(`Could not load payout account: ${error.message}`);
  if(!data)return null;
  return {id:data.id,providerAccountId:data.provider_account_id,onboardingStatus:data.onboarding_status,transfersEnabled:Boolean(data.transfers_enabled),payoutsEnabled:Boolean(data.payouts_enabled),requirementsDueCount:Number(data.requirements_due_count??0),futureRequirementsDueCount:Number(data.future_requirements_due_count??0),lastSyncedAt:data.last_synced_at,providerApiVersion:data.provider_api_version};
}

export async function upsertSellerStripePayoutAccount(input:{userId:string;providerAccountId:string;onboardingStatus:string;transfersEnabled:boolean;payoutsEnabled:boolean;requirementsDueCount:number;futureRequirementsDueCount:number;providerApiVersion:string}){
  const admin=createSupabaseAdminClient();
  const {data:existing}=await admin.from('payout_accounts').select('id').eq('user_id',input.userId).eq('provider','stripe').order('created_at',{ascending:false}).limit(1).maybeSingle();
  const values={provider_account_id:input.providerAccountId,onboarding_status:input.onboardingStatus,transfers_enabled:input.transfersEnabled,payouts_enabled:input.payoutsEnabled,charges_enabled:false,requirements_due_count:input.requirementsDueCount,future_requirements_due_count:input.futureRequirementsDueCount,provider_api_version:input.providerApiVersion,last_synced_at:new Date().toISOString()};
  if(existing?.id){const {error}=await admin.from('payout_accounts').update(values).eq('id',existing.id);if(error)throw new Error(error.message);return existing.id;}
  const {data,error}=await admin.from('payout_accounts').insert({user_id:input.userId,provider:'stripe',country_code:'SE',default_currency:'SEK',...values}).select('id').single();if(error)throw new Error(error.message);return data.id;
}
