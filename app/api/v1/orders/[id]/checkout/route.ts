import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrderForUser} from '@/src/modules/orders/infrastructure/supabase-orders';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';
import {createStripeCheckoutSession,stripePaymentsConfigured} from '@/src/modules/payments/infrastructure/stripe-connect';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const form=await request.formData(); const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const session=await getCurrentSession();
  if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login?next=/${locale}/orders/${id}`,request.url),303);
  const order=await getOrderForUser(id,session.user.id);
  if(!order||order.buyerUserId!==session.user.id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?payment=forbidden`,request.url),303);
  if(!['PENDING','PAYMENT_PENDING'].includes(order.status))return NextResponse.redirect(new URL(`/${locale}/orders/${id}?payment=unavailable`,request.url),303);
  if(!stripePaymentsConfigured())return NextResponse.redirect(new URL(`/${locale}/orders/${id}?payment=setup`,request.url),303);

  const admin=createSupabaseAdminClient();
  const {data:existing}=await admin.from('payments').select('id,provider_payload,checkout_expires_at,status').eq('order_id',id).eq('provider','stripe').in('status',['CREATED','REQUIRES_ACTION']).order('created_at',{ascending:false}).limit(1).maybeSingle();
  const existingUrl=(existing?.provider_payload as any)?.checkout_url as string|undefined;
  if(existing&&existingUrl&&existing.checkout_expires_at&&new Date(existing.checkout_expires_at).getTime()>Date.now()+30_000){return NextResponse.redirect(existingUrl,303);}

  const {data:payout}=await admin.from('payout_accounts').select('provider_account_id,onboarding_status,transfers_enabled,payouts_enabled').eq('user_id',order.sellerUserId).eq('provider','stripe').eq('onboarding_status','ACTIVE').eq('transfers_enabled',true).eq('payouts_enabled',true).limit(1).maybeSingle();
  if(!payout?.provider_account_id)return NextResponse.redirect(new URL(`/${locale}/orders/${id}?payment=seller_setup`,request.url),303);

  try{
    const checkout=await createStripeCheckoutSession({orderId:id,listingTitle:order.title,amountMinor:order.totalMinor,platformFeeMinor:order.platformFeeMinor,currency:order.currency,connectedAccountId:payout.provider_account_id,locale,appUrl:new URL(request.url).origin,buyerEmail:session.user.email});
    if(!checkout.url)throw new Error('Stripe Checkout returned no URL.');
    await admin.from('payments').insert({order_id:id,provider:'stripe',provider_payment_id:checkout.id,amount_minor:order.totalMinor,currency:order.currency,status:'REQUIRES_ACTION',idempotency_key:`checkout:${checkout.id}`,checkout_expires_at:new Date(checkout.expires_at*1000).toISOString(),provider_payload:{checkout_url:checkout.url,checkout_session_id:checkout.id}});
    if(order.status==='PENDING')await admin.from('orders').update({status:'PAYMENT_PENDING'}).eq('id',id);
    return NextResponse.redirect(checkout.url,303);
  }catch(error){console.error('checkout failed',error);return NextResponse.redirect(new URL(`/${locale}/orders/${id}?payment=error`,request.url),303);}
}
