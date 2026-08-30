import {createClient} from '@supabase/supabase-js';
import {runtimeConfig} from '@/src/shared/config/runtime';

export function createSupabaseAdminClient(){
  if(!runtimeConfig.supabase.url || !runtimeConfig.supabase.serviceRoleKey){
    throw new Error('Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(runtimeConfig.supabase.url,runtimeConfig.supabase.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
}
