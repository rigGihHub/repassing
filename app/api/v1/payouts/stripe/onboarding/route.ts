import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {runtimeConfig} from '@/src/shared/config/runtime';
import {createStripeRecipientAccount,createStripeRecipientOnboardingLink,retrieveStripeRecipientAccount,summarizeStripeRecipientAccount,stripeAccountsV2Version} from '@/src/modules/payouts/infrastructure/stripe-accounts-v2';
import {getSellerStripePayoutAccount,upsertSellerStripePayoutAccount} from '@/src/modules/payouts/infrastructure/supabase-payouts';

export async function POST(request:Request){
  const form=await request.formData(); const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';
  const session=await getCurrentSession();
  if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login?next=/${locale}/payouts`,request.url),303);
  if(runtimeConfig.payments.mode!=='stripe'||!runtimeConfig.payments.stripeSecretKey)return NextResponse.redirect(new URL(`/${locale}/payouts?setup=required`,request.url),303);
  try{
    let local=await getSellerStripePayoutAccount(session.user.id);
    if(!local){
      const account=await createStripeRecipientAccount({email:session.user.email,displayName:session.user.displayName||session.user.email,countryCode:session.user.countryCode||'SE'});
      const summary=summarizeStripeRecipientAccount(account);
      await upsertSellerStripePayoutAccount({userId:session.user.id,providerAccountId:account.id,onboardingStatus:summary.onboardingStatus,transfersEnabled:summary.transfersEnabled,payoutsEnabled:summary.payoutsEnabled,requirementsDueCount:summary.requirementsDue,futureRequirementsDueCount:summary.futureDue,providerApiVersion:stripeAccountsV2Version()});
      local=await getSellerStripePayoutAccount(session.user.id);
    }else{
      const account=await retrieveStripeRecipientAccount(local.providerAccountId); const summary=summarizeStripeRecipientAccount(account);
      await upsertSellerStripePayoutAccount({userId:session.user.id,providerAccountId:local.providerAccountId,onboardingStatus:summary.onboardingStatus,transfersEnabled:summary.transfersEnabled,payoutsEnabled:summary.payoutsEnabled,requirementsDueCount:summary.requirementsDue,futureRequirementsDueCount:summary.futureDue,providerApiVersion:stripeAccountsV2Version()});
    }
    if(!local)throw new Error('Payout account could not be created.');
    const origin=new URL(request.url).origin;
    const link=await createStripeRecipientOnboardingLink({accountId:local.providerAccountId,returnUrl:`${origin}/${locale}/payouts?onboarding=returned`,refreshUrl:`${origin}/api/v1/payouts/stripe/refresh?locale=${locale}`});
    return NextResponse.redirect(link.url,303);
  }catch(error){console.error('Stripe seller onboarding failed',error);return NextResponse.redirect(new URL(`/${locale}/payouts?onboarding=error`,request.url),303);}
}
