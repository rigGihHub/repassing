import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';
import {organizationRoleLabel} from '@/src/modules/organizations/application/organization-ui';

export default async function Page({params}: {params: Promise<{locale: string;slug: string}>}) {
  const {locale, slug} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/clubs/${slug}/admin`);

  const membership = (await getMembershipsForUser(session.user.id)).find((item) =>
    item.organization.slug === slug && (item.role === 'CLUB_ADMIN' || item.role === 'ORG_OWNER'));
  if (!membership) notFound();

  const sv = locale === 'sv';
  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}/clubs/${slug}`}>← {membership.organization.name}</Link></div>
    <section className="simpleHero">
      <span className="eyebrow">{sv ? 'Föreningsadmin' : 'Club admin'}</span>
      <h1>{membership.organization.name}</h1>
      <p>{sv ? 'Överblick över föreningen, din behörighet och anslutna lag.' : 'Overview of the club, your access and connected teams.'}</p>
    </section>
    <div className="accountGrid">
      <section className="accountPanel"><h2>{sv ? 'Föreningsprofil' : 'Club profile'}</h2><dl className="facts"><div><dt>{sv ? 'Land' : 'Country'}</dt><dd>{membership.organization.countryCode}</dd></div><div><dt>{sv ? 'Valuta' : 'Currency'}</dt><dd>{membership.organization.defaultCurrency}</dd></div><div><dt>{sv ? 'Behörighet' : 'Access'}</dt><dd>{organizationRoleLabel(membership.role, sv)}</dd></div></dl></section>
      <section className="accountPanel"><h2>{sv ? 'Lag' : 'Teams'}</h2>{membership.teamNames.length ? <div className="teamTags">{membership.teamNames.map((name) => <span key={name}>{name}</span>)}</div> : <p>{sv ? 'Inga lag är kopplade ännu.' : 'No teams are connected yet.'}</p>}<p className="panelNote">{sv ? 'Här visas de lag som redan är kopplade till din förening.' : 'Teams already connected to your club are shown here.'}</p></section>
    </div>
  </main>;
}
