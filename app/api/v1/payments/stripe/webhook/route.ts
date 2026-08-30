import {NextResponse} from 'next/server';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';
import {verifyStripeWebhook} from '@/src/modules/payments/infrastructure/stripe-connect';

export const runtime='nodejs';

export async function POST(request:Request){
  const payload=await request.text();
  if(!verifyStripeWebhook(payload,request.headers.get('stripe-signature')))return NextResponse.json({error:'invalid signature'},{status:400});
  let event:any; try{event=JSON.parse(payload);}catch{return NextResponse.json({error:'invalid json'},{status:400});}
  const admin=createSupabaseAdminClient();
  const {data:already}=await admin.from('payment_events').select('id').eq('provider','stripe').eq('provider_event_id',event.id).maybeSingle();
  if(already)return NextResponse.json({received:true,duplicate:true});
  await admin.from('payment_events').insert({provider:'stripe',provider_event_id:event.id,event_type:event.type,payload:event});
  const object=event?.data?.object??{}; const orderId=object?.metadata?.order_id;
  if(orderId){
    if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
      if(object.payment_status==='paid'||event.type==='checkout.session.async_payment_succeeded'){
        await admin.from('payments').update({status:'CAPTURED',provider_payment_id:object.payment_intent??object.id,provider_payload:object}).eq('order_id',orderId).eq('provider','stripe').in('status',['CREATED','REQUIRES_ACTION','AUTHORIZED']);
        const {data:order}=await admin.from('orders').select('status').eq('id',orderId).maybeSingle();
        if(order?.status==='PAYMENT_PENDING')await admin.from('orders').update({status:'PAID'}).eq('id',orderId);
      }
    }else if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
      await admin.from('payments').update({status:event.type.endsWith('failed')?'FAILED':'CANCELLED',provider_payload:object}).eq('order_id',orderId).eq('provider','stripe').in('status',['CREATED','REQUIRES_ACTION','AUTHORIZED']);
      const {data:order}=await admin.from('orders').select('status').eq('id',orderId).maybeSingle();
      if(order?.status==='PAYMENT_PENDING')await admin.from('orders').update({status:'CANCELLED'}).eq('id',orderId);
    }
  }
  await admin.from('payment_events').update({processed_at:new Date().toISOString()}).eq('provider','stripe').eq('provider_event_id',event.id);
  return NextResponse.json({received:true});
}
