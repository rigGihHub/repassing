import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getOrganizationBySlug} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';
import {organizationRoleLabel} from '@/src/modules/organizations/application/organization-ui';

export default async function ClubPage({params}: {params: Promise<{locale: string;slug: string}>}) {
  const {locale, slug} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const membership = await getOrganizationBySlug(slug);
  if (!membership) notFound();
  const sv = locale === 'sv';
  const club = membership.organization;
  const canAdmin = membership.role === 'CLUB_ADMIN' || membership.role === 'ORG_OWNER';
  const roleLabel = organizationRoleLabel(membership.role, sv);

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}/clubs`}>← {sv ? 'Mina föreningar' : 'My clubs'}</Link>{canAdmin && <Link className="inlineAction" href={`/${locale}/clubs/${slug}/admin`}>{sv ? 'Hantera föreningen' : 'Manage club'} →</Link>}</div>
    <section className="clubHero"><div><span className="eyebrow">{sv ? 'Förening' : 'Club'}</span><h1>{club.name}</h1><p>{sv ? 'Din föreningsyta på Repassing.' : 'Your club space on Repassing.'}</p><div className="clubHeroActions"><Link className="clubHeroPrimary" href={`/${locale}?organization=${club.id}#marketplace-grid`}>{sv ? 'Visa föreningens marknad' : 'View club marketplace'}</Link><Link className="clubHeroSecondary" href={`/${locale}/sell?organization=${club.id}`}>＋ {sv ? 'Sälj i föreningen' : 'Sell in this club'}</Link></div></div><div className="rolePill">{roleLabel}</div></section>
    <div className="accountGrid">
      <section className="accountPanel"><h2>{sv ? 'Föreningen' : 'Club'}</h2><dl className="facts"><div><dt>{sv ? 'Land' : 'Country'}</dt><dd>{club.countryCode}</dd></div><div><dt>{sv ? 'Valuta' : 'Currency'}</dt><dd>{club.defaultCurrency}</dd></div></dl></section>
      <section className="accountPanel"><h2>{sv ? 'Lag' : 'Teams'}</h2>{membership.teamNames.length ? <div className="teamTags">{membership.teamNames.map((name) => <span key={name}>{name}</span>)}</div> : <p>{sv ? 'Inga lag är kopplade till ditt medlemskap ännu.' : 'No teams are linked to your membership yet.'}</p>}</section>
    </div>
  </main>;
}
