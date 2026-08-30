import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';
import {getListingsForSeller} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv = locale === 'sv';
  const session = await getCurrentSession();
  if (!session) return <main className="accountShell"><section className="authCard"><h1>{sv?'Du är inte inloggad':'You are not signed in'}</h1><Link className="primary inlineAction" href={`/${locale}/login`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const memberships = await getMembershipsForUser(session.user.id);
  const sellerListings = session.preview ? [] : await getListingsForSeller(session.user.id);

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className="previewBadge">{session.preview?'PREVIEW IDENTITY':'AUTHENTICATED'}</span></div>
    <section className="accountHero">
      <div className="avatar">RP</div>
      <div><span className="eyebrow">{sv?'Min profil':'My profile'}</span><h1>{session.user.displayName}</h1><p>{session.user.email}</p></div>
    </section>
    <div className="profileActions"><Link className="primary inlineAction" href={`/${locale}/sell`}>＋ {sv?'Skapa annons':'Create listing'}</Link><Link className="secondary inlineAction" href={`/${locale}/orders`}>{sv?'Mina affärer':'My orders'}</Link><Link className="secondary inlineAction" href={`/${locale}/messages`}>{sv?'Meddelanden':'Messages'}</Link><Link className="secondary inlineAction" href={`/${locale}/notifications`}>{sv?'Notifieringar':'Notifications'}</Link><Link className="secondary inlineAction" href={`/${locale}/payouts`}>{sv?'Utbetalningar':'Payouts'}</Link></div>
    <div className="accountGrid">
      <section className="accountPanel"><h2>{sv?'Föreningar':'Organizations'}</h2><p>{sv?'Samma konto kan tillhöra flera föreningar och lag.':'One account can belong to multiple organizations and teams.'}</p>
        <div className="membershipList">{memberships.map((m)=><Link className="membershipRow" href={`/${locale}/clubs/${m.organization.slug}`} key={m.id}><div><strong>{m.organization.name}</strong><span>{m.teamNames.join(', ') || (sv?'Inget lag kopplat':'No team linked')}</span></div><b>{m.role}</b></Link>)}</div>
      </section>
      <section className="accountPanel"><h2>{sv?'Kontogrund':'Account foundation'}</h2><dl className="facts"><div><dt>{sv?'Land':'Country'}</dt><dd>{session.user.countryCode}</dd></div><div><dt>{sv?'Språk':'Locale'}</dt><dd>{session.user.locale}</dd></div><div><dt>Status</dt><dd>{session.user.status}</dd></div><div><dt>Provider</dt><dd>{session.authProvider}</dd></div></dl><p className="panelNote">{session.preview ? (sv?'Preview-läget är aktivt tills Supabase och produktionsdatabasen kopplas i Vercel.':'Preview mode stays active until Supabase and the production database are connected in Vercel.') : (sv?'Identiteten verifieras server-side via Supabase. Föreningsdata hämtas separat genom Repassings datalager.':'Identity is verified server-side through Supabase. Organization data is resolved separately through Repassing’s data layer.')}</p></section>
    </div>
    {!session.preview && <section className="accountPanel sellerListings"><h2>{sv?'Mina annonser':'My listings'}</h2>{sellerListings.length===0?<p>{sv?'Du har inga annonser ännu.':'You have no listings yet.'}</p>:<div className="membershipList">{sellerListings.map((l:any)=><Link className="membershipRow" href={`/${locale}/listings/${l.id}`} key={l.id}><div><strong>{l.title}</strong><span>{l.status}</span></div><b>{new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:l.currency,maximumFractionDigits:0}).format(Number(l.price_minor)/100)}</b></Link>)}</div>}</section>}
    {!session.preview && <form action="/api/v1/auth/sign-out" method="post" className="signOutForm"><input type="hidden" name="locale" value={locale}/><button className="secondary" type="submit">{sv?'Logga ut':'Sign out'}</button></form>}
  </main>;
}
