import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export type AppNotification={
  id:string;
  type:string;
  title:string;
  body:string|null;
  entityType:string|null;
  entityId:string|null;
  actionUrl:string|null;
  readAt:string|null;
  createdAt:string;
};

export async function getNotificationsForUser(userId:string,limit=60):Promise<AppNotification[]>{
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from('notification_inbox').select('id,type,title,body,entity_type,entity_id,action_url,read_at,created_at').eq('user_id',userId).lte('available_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(limit);
  if(error)throw new Error(`Could not load notifications: ${error.message}`);
  return (data??[]).map((row:any)=>({id:row.id,type:row.type,title:row.title,body:row.body,entityType:row.entity_type,entityId:row.entity_id,actionUrl:row.action_url,readAt:row.read_at,createdAt:row.created_at}));
}

export async function getUnreadNotificationCount(userId:string):Promise<number>{
  const supabase=await createSupabaseServerClient();
  const {count,error}=await supabase.from('notification_inbox').select('id',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null).lte('available_at',new Date().toISOString());
  if(error)return 0;
  return count??0;
}
