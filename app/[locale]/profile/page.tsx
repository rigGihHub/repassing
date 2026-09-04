import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';
import {getListingsForSeller} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {getCompletedDealCountForUser} from '@/src/modules/orders/infrastructure/supabase-orders';
import {organizationRoleLabel} from '@/src/modules/organizations/application/organization-ui';
import {runtimeConfig} from '@/src/shared/config/runtime';

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv = locale === 'sv';
  const session = await getCurrentSession();
  if (!session) return <main className="accountShell"><section className="authCard"><h1>{sv?'Du är inte inloggad':'You are not signed in'}</h1><Link className="primary inlineAction" href={`/${locale}/login`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const [memberships, sellerListings, completedDeals] = await Promise.all([
    getMembershipsForUser(session.user.id),
    session.preview ? Promise.resolve([]) : getListingsForSeller(session.user.id),
    session.preview ? Promise.resolve(0) : getCompletedDealCountForUser(session.user.id)
  ]);

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link></div>
    <section className="accountHero profileHero">
      <div className="avatar">RP</div>
      <div className="profileHeroCopy"><span className="eyebrow">{sv?'MIN PROFIL':'MY PROFILE'}</span><h1>{session.user.displayName}</h1><p>{session.user.email}</p><div className="trustSignals"><span><b>{completedDeals}</b>{sv?' genomförda affärer':' completed deals'}</span><span><b>{memberships.length}</b>{memberships.length===1?(sv?' förening':' club'):(sv?' föreningar':' clubs')}</span></div></div>
    </section>
    <div className="profileActions"><Link className="primary inlineAction" href={`/${locale}/sell`}>＋ {sv?'Skapa annons':'Create listing'}</Link><Link className="secondary inlineAction" href={`/${locale}/orders`}>{sv?'Mina affärer':'My orders'}</Link><Link className="secondary inlineAction" href={`/${locale}/messages`}>{sv?'Meddelanden':'Messages'}</Link><Link className="secondary inlineAction" href={`/${locale}/notifications`}>{sv?'Notifieringar':'Notifications'}</Link>{runtimeConfig.payments.mode==='stripe'&&<Link className="secondary inlineAction" href={`/${locale}/payouts`}>{sv?'Utbetalningar':'Payouts'}</Link>}</div>
    <div className="accountGrid">
      <section className="accountPanel"><h2>{sv?'Mina föreningar':'My clubs'}</h2><p>{sv?'Föreningskopplingen gör det enklare att känna igen vem du gör affär med.':'Club membership makes it easier to recognize who you are dealing with.'}</p>
        {memberships.length===0?<div className="profileEmpty"><strong>{sv?'Ingen förening kopplad ännu':'No club connected yet'}</strong><p>{sv?'Du kan fortfarande köpa och sälja. Koppla en förening när du vill.':'You can still buy and sell. Connect a club whenever you want.'}</p><Link className="secondary inlineAction" href={`/${locale}/clubs`}>{sv?'Se föreningar':'View clubs'}</Link></div>:<div className="membershipList">{memberships.map((m)=><Link className="membershipRow" href={`/${locale}/clubs/${m.organization.slug}`} key={m.id}><div><strong>{m.organization.name}</strong><span>{m.teamNames.join(', ') || (sv?'Föreningsmedlem':'Club member')}</span></div><b>{organizationRoleLabel(m.role,sv)}</b></Link>)}</div>}
      </section>
      <section className="accountPanel trustPanel"><h2>{sv?'Trygg profil':'Trusted profile'}</h2><p>{sv?'Repassing visar enkla fakta som hjälper andra att känna sig trygga — utan betyg eller offentliga omdömen.':'Repassing shows simple facts that help others feel comfortable — without ratings or public reviews.'}</p><dl className="facts"><div><dt>{sv?'Genomförda affärer':'Completed deals'}</dt><dd>{completedDeals}</dd></div><div><dt>{sv?'Föreningskopplingar':'Club connections'}</dt><dd>{memberships.length}</dd></div><div><dt>{sv?'Konto':'Account'}</dt><dd>{sv?'E-post verifierad':'Email verified'}</dd></div></dl></section>
    </div>
    {!session.preview && <section className="accountPanel sellerListings"><h2>{sv?'Mina annonser':'My listings'}</h2>{sellerListings.length===0?<p>{sv?'Du har inga annonser ännu.':'You have no listings yet.'}</p>:<div className="membershipList">{sellerListings.map((l:any)=><Link className="membershipRow" href={`/${locale}/listings/${l.id}`} key={l.id}><div><strong>{l.title}</strong><span>{l.status}</span></div><b>{new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:l.currency,maximumFractionDigits:0}).format(Number(l.price_minor)/100)}</b></Link>)}</div>}</section>}
    {!session.preview && <form action="/api/v1/auth/sign-out" method="post" className="signOutForm"><input type="hidden" name="locale" value={locale}/><button className="secondary" type="submit">{sv?'Logga ut':'Sign out'}</button></form>}
  </main>;
}
