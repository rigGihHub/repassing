import {createHmac,timingSafeEqual} from 'node:crypto';
import {runtimeConfig} from '@/src/shared/config/runtime';

type StripeCheckoutInput={orderId:string;listingTitle:string;amountMinor:number;platformFeeMinor:number;currency:string;connectedAccountId:string;locale:string;appUrl:string;buyerEmail?:string|null};
type StripeCheckoutSession={id:string;url:string|null;expires_at:number;payment_intent?:string|null;payment_status?:string;status?:string;metadata?:Record<string,string>};

function stripeSecret(){const key=runtimeConfig.payments.stripeSecretKey;if(!key)throw new Error('STRIPE_SECRET_KEY is not configured.');return key;}
export function stripePaymentsConfigured(){return runtimeConfig.payments.mode==='stripe'&&Boolean(runtimeConfig.payments.stripeSecretKey&&runtimeConfig.payments.stripeWebhookSecret&&runtimeConfig.supabase.serviceRoleKey);}

export async function createStripeCheckoutSession(input:StripeCheckoutInput):Promise<StripeCheckoutSession>{
  const base=input.appUrl.replace(/\/$/,'');const params=new URLSearchParams();
  params.set('mode','payment');
  params.set('success_url',`${base}/${input.locale}/orders/${input.orderId}?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url',`${base}/${input.locale}/orders/${input.orderId}?payment=cancelled`);
  params.set('line_items[0][price_data][currency]',input.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]',String(input.amountMinor));
  params.set('line_items[0][price_data][product_data][name]',input.listingTitle.slice(0,120));
  params.set('line_items[0][quantity]','1');
  params.set('metadata[order_id]',input.orderId);
  params.set('payment_intent_data[metadata][order_id]',input.orderId);
  params.set('payment_intent_data[application_fee_amount]',String(input.platformFeeMinor));
  params.set('payment_intent_data[transfer_data][destination]',input.connectedAccountId);
  if(input.buyerEmail)params.set('customer_email',input.buyerEmail);
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${stripeSecret()}`,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});
  const json=await response.json() as any;if(!response.ok)throw new Error(json?.error?.message??'Stripe Checkout could not be created.');return json as StripeCheckoutSession;
}

export function verifyStripeWebhook(payload:string,signatureHeader:string|null){
  const secret=runtimeConfig.payments.stripeWebhookSecret;if(!secret||!signatureHeader)return false;
  const parts=signatureHeader.split(',').map(v=>v.trim());const timestamp=parts.find(v=>v.startsWith('t='))?.slice(2);const signatures=parts.filter(v=>v.startsWith('v1=')).map(v=>v.slice(3));
  if(!timestamp||!signatures.length)return false;const ts=Number(timestamp);if(!Number.isFinite(ts)||Math.abs(Math.floor(Date.now()/1000)-ts)>300)return false;
  const expected=createHmac('sha256',secret).update(`${timestamp}.${payload}`,'utf8').digest('hex');const expectedBuffer=Buffer.from(expected,'utf8');
  return signatures.some(sig=>{try{const candidate=Buffer.from(sig,'utf8');return candidate.length===expectedBuffer.length&&timingSafeEqual(candidate,expectedBuffer);}catch{return false;}});
}
