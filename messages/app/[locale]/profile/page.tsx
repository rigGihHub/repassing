import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const session = await getCurrentSession();
  if (!session) return null;
  const memberships = await getMembershipsForUser(session.user.id);
  const sv = locale === 'sv';

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className="previewBadge">PREVIEW IDENTITY</span></div>
    <section className="accountHero">
      <div className="avatar">RP</div>
      <div><span className="eyebrow">{sv?'Min profil':'My profile'}</span><h1>{session.user.displayName}</h1><p>{session.user.email}</p></div>
    </section>
    <div className="accountGrid">
      <section className="accountPanel"><h2>{sv?'Föreningar':'Organizations'}</h2><p>{sv?'Samma konto kan tillhöra flera föreningar och lag.':'One account can belong to multiple organizations and teams.'}</p>
        <div className="membershipList">{memberships.map((m)=><Link className="membershipRow" href={`/${locale}/clubs/${m.organization.slug}`} key={m.id}><div><strong>{m.organization.name}</strong><span>{m.teamNames.join(', ') || (sv?'Inget lag kopplat':'No team linked')}</span></div><b>{m.role}</b></Link>)}</div>
      </section>
      <section className="accountPanel"><h2>{sv?'Kontogrund':'Account foundation'}</h2><dl className="facts"><div><dt>{sv?'Land':'Country'}</dt><dd>{session.user.countryCode}</dd></div><div><dt>{sv?'Språk':'Locale'}</dt><dd>{session.user.locale}</dd></div><div><dt>Status</dt><dd>{session.user.status}</dd></div><div><dt>Provider</dt><dd>{session.authProvider}</dd></div></dl><p className="panelNote">{sv?'Den här releasen använder en tydligt markerad preview-identitet. Produktionsinloggning kopplas genom IdentityProvider-gränssnittet utan att resten av appen behöver byggas om.':'This release uses an explicitly marked preview identity. Production authentication plugs into the IdentityProvider port without rebuilding the rest of the app.'}</p></section>
    </div>
  </main>;
}
