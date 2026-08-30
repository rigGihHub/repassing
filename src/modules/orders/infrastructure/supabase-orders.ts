import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export type MarketplaceOrder = {
  id:string; listingId:string; title:string; imageUrl:string|null; buyerUserId:string; sellerUserId:string;
  subtotalMinor:number; platformFeeMinor:number; buyerFeeMinor:number; sellerFeeMinor:number; sellerNetMinor:number; totalMinor:number; currency:string; status:string; createdAt:string;
  fulfillmentStatus:string|null; fulfillmentMethod:string|null; handoffLocation:string|null; scheduledAt:string|null; sellerConfirmedAt:string|null; buyerConfirmedAt:string|null; fulfillmentCompletedAt:string|null; conversationId:string|null;
};

export type OrderHistoryItem={id:string;fromStatus:string|null;toStatus:string;reasonCode:string|null;createdAt:string};

const select=`id,listing_id,buyer_user_id,seller_user_id,subtotal_minor,platform_fee_minor,buyer_fee_minor,seller_fee_minor,seller_net_minor,total_minor,currency,status,created_at,listing:listings(title,images:listing_images(storage_bucket,storage_path,sort_order)),fulfillment:fulfillments(method,status,handoff_location,scheduled_at,seller_confirmed_at,buyer_confirmed_at,completed_at),conversation:conversations(id)`;

export async function getOrdersForUser(userId:string, limit=50):Promise<MarketplaceOrder[]> {
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from('orders').select(select).or(`buyer_user_id.eq.${userId},seller_user_id.eq.${userId}`).order('created_at',{ascending:false}).limit(limit);
  if(error) throw new Error(`Could not load orders: ${error.message}`);
  return (data??[]).map((row:any)=>mapOrder(row,supabase));
}

export async function getOrderForUser(orderId:string,userId:string):Promise<MarketplaceOrder|null>{
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from('orders').select(select).eq('id',orderId).maybeSingle();
  if(error) throw new Error(`Could not load order: ${error.message}`);
  if(!data || (data.buyer_user_id!==userId && data.seller_user_id!==userId)) return null;
  return mapOrder(data,supabase);
}

export async function getOrderHistory(orderId:string):Promise<OrderHistoryItem[]>{
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from('order_status_history').select('id,from_status,to_status,reason_code,created_at').eq('order_id',orderId).order('created_at',{ascending:true});
  if(error) return [];
  return (data??[]).map((r:any)=>({id:r.id,fromStatus:r.from_status,toStatus:r.to_status,reasonCode:r.reason_code,createdAt:r.created_at}));
}

function mapOrder(row:any,supabase:Awaited<ReturnType<typeof createSupabaseServerClient>>):MarketplaceOrder{
  const listing=Array.isArray(row.listing)?row.listing[0]:row.listing;
  const images=(listing?.images??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order);
  const image=images[0];
  const fulfillment=Array.isArray(row.fulfillment)?row.fulfillment[0]:row.fulfillment;
  const conversation=Array.isArray(row.conversation)?row.conversation[0]:row.conversation;
  return {id:row.id,listingId:row.listing_id,title:listing?.title??'Annons',imageUrl:image?supabase.storage.from(image.storage_bucket).getPublicUrl(image.storage_path).data.publicUrl:null,buyerUserId:row.buyer_user_id,sellerUserId:row.seller_user_id,subtotalMinor:Number(row.subtotal_minor),platformFeeMinor:Number(row.platform_fee_minor),buyerFeeMinor:Number(row.buyer_fee_minor??0),sellerFeeMinor:Number(row.seller_fee_minor??0),sellerNetMinor:Number(row.seller_net_minor??row.subtotal_minor),totalMinor:Number(row.total_minor),currency:row.currency,status:row.status,createdAt:row.created_at,fulfillmentStatus:fulfillment?.status??null,fulfillmentMethod:fulfillment?.method??null,handoffLocation:fulfillment?.handoff_location??null,scheduledAt:fulfillment?.scheduled_at??null,sellerConfirmedAt:fulfillment?.seller_confirmed_at??null,buyerConfirmedAt:fulfillment?.buyer_confirmed_at??null,fulfillmentCompletedAt:fulfillment?.completed_at??null,conversationId:conversation?.id??null};
}
