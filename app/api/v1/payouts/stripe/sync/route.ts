import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getSellerStripePayoutAccount,upsertSellerStripePayoutAccount} from '@/src/modules/payouts/infrastructure/supabase-payouts';
import {retrieveStripeRecipientAccount,summarizeStripeRecipientAccount,stripeAccountsV2Version} from '@/src/modules/payouts/infrastructure/stripe-accounts-v2';

export async function POST(request:Request){
  const form=await request.formData();const locale=String(form.get('locale')??'sv')==='en'?'en':'sv';const session=await getCurrentSession();if(!session||session.preview)return NextResponse.redirect(new URL(`/${locale}/login`,request.url),303);
  try{const local=await getSellerStripePayoutAccount(session.user.id);if(!local)return NextResponse.redirect(new URL(`/${locale}/payouts`,request.url),303);const remote=await retrieveStripeRecipientAccount(local.providerAccountId);const summary=summarizeStripeRecipientAccount(remote);await upsertSellerStripePayoutAccount({userId:session.user.id,providerAccountId:local.providerAccountId,onboardingStatus:summary.onboardingStatus,transfersEnabled:summary.transfersEnabled,payoutsEnabled:summary.payoutsEnabled,requirementsDueCount:summary.requirementsDue,futureRequirementsDueCount:summary.futureDue,providerApiVersion:stripeAccountsV2Version()});return NextResponse.redirect(new URL(`/${locale}/payouts?synced=1`,request.url),303);}catch(error){console.error(error);return NextResponse.redirect(new URL(`/${locale}/payouts?synced=error`,request.url),303);}
}
