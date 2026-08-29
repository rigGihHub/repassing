import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getOrganizationBySlug} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';

export default async function ClubPage({params}: {params: Promise<{locale: string;slug: string}>}) {
  const {locale, slug} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const membership = await getOrganizationBySlug(slug);
  if (!membership) notFound();
  const sv = locale === 'sv';
  const club = membership.organization;
  return <main className="accountShell"><div className="accountTop"><Link href={`/${locale}/clubs`}>← {sv?'Mina föreningar':'My organizations'}</Link></div><section className="clubHero"><div><span className="eyebrow">{club.type}</span><h1>{club.name}</h1><p>{sv?'Föreningsyta och marknadskontext.':'Organization workspace and marketplace context.'}</p></div><div className="rolePill">{membership.role}</div></section><div className="accountGrid"><section className="accountPanel"><h2>{sv?'Organisation':'Organization'}</h2><dl className="facts"><div><dt>Slug</dt><dd>{club.slug}</dd></div><div><dt>{sv?'Land':'Country'}</dt><dd>{club.countryCode}</dd></div><div><dt>{sv?'Valuta':'Currency'}</dt><dd>{club.defaultCurrency}</dd></div><div><dt>{sv?'Språk':'Locale'}</dt><dd>{club.locale}</dd></div></dl></section><section className="accountPanel"><h2>{sv?'Lag':'Teams'}</h2>{membership.teamNames.length?<div className="teamTags">{membership.teamNames.map((name)=><span key={name}>{name}</span>)}</div>:<p>{sv?'Inga lag kopplade till detta medlemskap ännu.':'No teams linked to this membership yet.'}</p>}<p className="panelNote">{sv?'Nästa lager kopplar riktig databas, inbjudningar och behörighetskontroller till dessa domänobjekt.':'The next layer connects the real database, invitations and authorization checks to these domain objects.'}</p></section></div></main>;
}
