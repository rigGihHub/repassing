import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createStripeRecipientOnboardingLink} from '@/src/modules/payouts/infrastructure/stripe-accounts-v2';
import {getSellerStripePayoutAccount} from '@/src/modules/payouts/infrastructure/supabase-payouts';

export async function GET(request:Request){
  const url=new URL(request.url); const locale=url.searchParams.get('locale')==='en'?'en':'sv';
  const session=await getCurrentSession(); if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login?next=/${locale}/payouts`,request.url),303);
  try{const account=await getSellerStripePayoutAccount(session.user.id);if(!account)return NextResponse.redirect(new URL(`/${locale}/payouts`,request.url),303);const origin=url.origin;const link=await createStripeRecipientOnboardingLink({accountId:account.providerAccountId,returnUrl:`${origin}/${locale}/payouts?onboarding=returned`,refreshUrl:`${origin}/api/v1/payouts/stripe/refresh?locale=${locale}`});return NextResponse.redirect(link.url,303);}catch(error){console.error(error);return NextResponse.redirect(new URL(`/${locale}/payouts?onboarding=error`,request.url),303);}
}
