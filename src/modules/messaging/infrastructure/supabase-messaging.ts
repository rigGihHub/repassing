import {createSupabaseServerClient} from '@/src/shared/supabase/server';
export type ConversationSummary={id:string;listingId:string|null;orderId:string|null;listingTitle:string|null;updatedAt:string;lastMessage:string|null;lastMessageAt:string|null;};
export type ConversationDetail=ConversationSummary&{messages:{id:string;senderUserId:string;body:string;createdAt:string;}[]};
export async function getConversationsForUser(userId:string):Promise<ConversationSummary[]>{
  const supabase=await createSupabaseServerClient();
  const {data:participants,error:pError}=await supabase.from('conversation_participants').select('conversation_id').eq('user_id',userId);
  if(pError) throw new Error(`Could not load conversations: ${pError.message}`);
  const ids=(participants??[]).map((x:any)=>x.conversation_id as string); if(!ids.length)return [];
  const {data,error}=await supabase.from('conversations').select('id,listing_id,order_id,updated_at,listing:listings(title),messages(body,created_at)').in('id',ids).order('updated_at',{ascending:false});
  if(error) throw new Error(`Could not load conversations: ${error.message}`);
  return (data??[]).map((row:any)=>{const listing=Array.isArray(row.listing)?row.listing[0]:row.listing;const messages=[...(row.messages??[])].sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));return{id:row.id,listingId:row.listing_id,orderId:row.order_id,listingTitle:listing?.title??null,updatedAt:row.updated_at,lastMessage:messages[0]?.body??null,lastMessageAt:messages[0]?.created_at??null};});
}
export async function getConversationForUser(id:string,userId:string):Promise<ConversationDetail|null>{
  const supabase=await createSupabaseServerClient();
  const {data:participant}=await supabase.from('conversation_participants').select('conversation_id').eq('conversation_id',id).eq('user_id',userId).maybeSingle(); if(!participant)return null;
  const {data,error}=await supabase.from('conversations').select('id,listing_id,order_id,updated_at,listing:listings(title),messages(id,sender_user_id,body,created_at)').eq('id',id).maybeSingle();
  if(error) throw new Error(`Could not load conversation: ${error.message}`); if(!data)return null;
  const listing=Array.isArray(data.listing)?data.listing[0]:data.listing; const messages=[...(data.messages??[])].sort((a:any,b:any)=>String(a.created_at).localeCompare(String(b.created_at)));
  return{id:data.id,listingId:data.listing_id,orderId:data.order_id,listingTitle:listing?.title??null,updatedAt:data.updated_at,lastMessage:messages.at(-1)?.body??null,lastMessageAt:messages.at(-1)?.created_at??null,messages:messages.map((m:any)=>({id:m.id,senderUserId:m.sender_user_id,body:m.body,createdAt:m.created_at}))};
}
