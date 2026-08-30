import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {platformConfig} from '@/src/shared/config/platform';
import {runtimeConfig} from '@/src/shared/config/runtime';
import {getSellerStripePayoutAccount} from '@/src/modules/payouts/infrastructure/supabase-payouts';
import {createSupabaseAdminClient} from '@/src/shared/supabase/admin';

export default async function PayoutsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {locale}=await params;if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound();const sv=locale==='sv';const session=await getCurrentSession();const qs=await searchParams;
  if(!session)return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att hantera utbetalningar':'Sign in to manage payouts'}</h1><Link className="primary inlineAction" href={`/${locale}/login?next=/${locale}/payouts`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  if(session.preview)return <main className="accountShell"><section className="authCard"><h1>{sv?'Utbetalningar kräver livekonto':'Payouts require a live account'}</h1></section></main>;
  const account=await getSellerStripePayoutAccount(session.user.id);
  const admin=createSupabaseAdminClient();
  const {data:payoutRows}=await admin.from('payouts').select('id,amount_minor,currency,status,available_at,paid_at,created_at').eq('seller_user_id',session.user.id).order('created_at',{ascending:false}).limit(20);
  const configured=runtimeConfig.payments.mode==='stripe'&&Boolean(runtimeConfig.payments.stripeSecretKey);
  const active=account?.onboardingStatus==='ACTIVE'&&account.transfersEnabled;
  return <main className="accountShell"><div className="accountTop"><Link href={`/${locale}/profile`}>← {sv?'Profil':'Profile'}</Link><span className="previewBadge">STRIPE CONNECT</span></div>
    <section className="accountHero"><div className="avatar">kr</div><div><span className="eyebrow">{sv?'Säljarutbetalningar':'Seller payouts'}</span><h1>{sv?'Ta emot pengar via Stripe':'Receive money through Stripe'}</h1><p>{sv?'Stripe sköter identitetskontroll och bankuppgifter. Repassing lagrar inte dina bankuppgifter.':'Stripe handles identity verification and bank details. Repassing does not store your bank details.'}</p></div></section>
    {qs.onboarding==='returned'&&<p className="successBanner">{sv?'Du är tillbaka från Stripe. Synkronisera status nedan.':'You are back from Stripe. Sync the status below.'}</p>}
    <section className="accountPanel"><h2>{sv?'Status':'Status'}</h2>
      {!configured?<><p>{sv?'Stripe är ännu inte aktiverat i produktionsmiljön. Flödet är byggt men kan inte startas innan Stripe-nycklarna är konfigurerade.':'Stripe is not yet enabled in production. The flow is built but cannot start until Stripe keys are configured.'}</p></>:account? <>
        <dl className="facts"><div><dt>{sv?'Onboarding':'Onboarding'}</dt><dd>{account.onboardingStatus}</dd></div><div><dt>{sv?'Överföringar':'Transfers'}</dt><dd>{account.transfersEnabled?'ACTIVE':'PENDING'}</dd></div><div><dt>{sv?'Krav kvar':'Requirements due'}</dt><dd>{account.requirementsDueCount}</dd></div><div><dt>{sv?'Framtida krav':'Future requirements'}</dt><dd>{account.futureRequirementsDueCount}</dd></div></dl>
        <div className="profileActions"><form action="/api/v1/payouts/stripe/onboarding" method="post"><input type="hidden" name="locale" value={locale}/><button className="primary" type="submit">{active?(sv?'Öppna Stripe-onboarding igen':'Open Stripe onboarding again'):(sv?'Fortsätt hos Stripe':'Continue with Stripe')}</button></form><form action="/api/v1/payouts/stripe/sync" method="post"><input type="hidden" name="locale" value={locale}/><button className="secondary" type="submit">{sv?'Synkronisera status':'Sync status'}</button></form></div>
      </>:<form action="/api/v1/payouts/stripe/onboarding" method="post"><input type="hidden" name="locale" value={locale}/><button className="primary" type="submit">{sv?'Aktivera utbetalningar':'Activate payouts'}</button></form>}
    </section>
    <section className="accountPanel"><h2>{sv?'Utbetalningshistorik':'Payout history'}</h2>{!payoutRows?.length?<p>{sv?'Inga utbetalningar ännu. De visas här när betalda order fördelas till ditt Stripe-konto.':'No payouts yet. They appear here when paid orders are allocated to your Stripe account.'}</p>:<div className="membershipList">{payoutRows.map((p:any)=><div className="membershipRow" key={p.id}><div><strong>{new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:p.currency}).format(Number(p.amount_minor)/100)}</strong><span>{p.status}</span></div><b>{new Date(p.paid_at??p.created_at).toLocaleDateString(sv?'sv-SE':'en-GB')}</b></div>)}</div>}</section>
  </main>;
}
