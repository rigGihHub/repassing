import {runtimeConfig} from '@/src/shared/config/runtime';

const defaultVersion = '2026-07-29.preview';
function secret(){if(!runtimeConfig.payments.stripeSecretKey)throw new Error('STRIPE_SECRET_KEY is not configured.');return runtimeConfig.payments.stripeSecretKey;}
function version(){return runtimeConfig.payments.stripeAccountsV2Version || defaultVersion;}

async function stripeV2<T>(path:string, init:RequestInit = {}):Promise<T>{
  const response=await fetch(`https://api.stripe.com${path}`,{
    ...init,
    headers:{Authorization:`Bearer ${secret()}`,'Stripe-Version':version(),'Content-Type':'application/json',...(init.headers??{})},
    cache:'no-store'
  });
  const json=await response.json() as any;
  if(!response.ok)throw new Error(json?.error?.message??json?.message??`Stripe v2 request failed (${response.status}).`);
  return json as T;
}

export type StripeRecipientAccount={
  id:string; contact_email?:string|null; display_name?:string|null; dashboard?:string|null;
  configuration?:{recipient?:{capabilities?:{stripe_balance?:{stripe_transfers?:{status?:string}}}}}|null;
  requirements?:{entries?:unknown[]|null;summary?:{minimum_deadline?:{status?:string|null}|null}|null}|null;
  future_requirements?:{entries?:unknown[]|null}|null;
};

export async function createStripeRecipientAccount(input:{email:string;displayName:string;countryCode:string}){
  return stripeV2<StripeRecipientAccount>('/v2/core/accounts',{
    method:'POST',
    headers:{'Idempotency-Key':`repassing-seller-${input.email.toLowerCase()}`},
    body:JSON.stringify({
      contact_email:input.email,
      display_name:input.displayName.slice(0,120),
      defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},
      dashboard:'express',
      identity:{country:input.countryCode.toLowerCase()},
      configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}},
      metadata:{platform:'repassing'},
      include:['configuration.recipient','identity','requirements','future_requirements','defaults']
    })
  });
}

export async function createStripeRecipientOnboardingLink(input:{accountId:string;returnUrl:string;refreshUrl:string}){
  return stripeV2<{url:string;expires_at?:string|number}>('/v2/core/account_links',{
    method:'POST',
    body:JSON.stringify({
      account:input.accountId,
      use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],refresh_url:input.refreshUrl,return_url:input.returnUrl,collection_options:{fields:'eventually_due',future_requirements:'include'}}}
    })
  });
}

export async function retrieveStripeRecipientAccount(accountId:string){
  const q=new URLSearchParams();
  ['configuration.recipient','requirements','future_requirements','defaults','identity'].forEach((v,i)=>q.set(`include[${i}]`,v));
  return stripeV2<StripeRecipientAccount>(`/v2/core/accounts/${encodeURIComponent(accountId)}?${q.toString()}`,{method:'GET',headers:{'Content-Type':'application/json'}});
}

export function summarizeStripeRecipientAccount(account:StripeRecipientAccount){
  const transferStatus=account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? 'pending';
  const requirementsDue=account.requirements?.entries?.length ?? 0;
  const futureDue=account.future_requirements?.entries?.length ?? 0;
  const active=transferStatus==='active' && requirementsDue===0;
  return {transferStatus,requirementsDue,futureDue,onboardingStatus:active?'ACTIVE':requirementsDue>0?'PENDING':'PENDING',transfersEnabled:transferStatus==='active',payoutsEnabled:active};
}

export function stripeAccountsV2Version(){return version();}
