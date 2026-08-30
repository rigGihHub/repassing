import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {platformConfig} from '@/src/shared/config/platform';

export default async function ClubsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const session = await getCurrentSession();
  if (!session) return null;
  const memberships = await getMembershipsForUser(session.user.id);
  const sv = locale === 'sv';
  return <main className="accountShell"><div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link></div><section className="simpleHero"><span className="eyebrow">{sv?'Organisationer':'Organizations'}</span><h1>{sv?'Mina föreningar':'My organizations'}</h1><p>{sv?'Repassing är byggt för flera föreningar, sektioner och lag från samma användarkonto.':'Repassing is built for multiple clubs, sections and teams from one user account.'}</p></section><div className="clubGrid">{memberships.map((m)=><Link href={`/${locale}/clubs/${m.organization.slug}`} className="clubCard" key={m.id}><span>{m.organization.type}</span><h2>{m.organization.name}</h2><p>{m.teamNames.join(', ') || (sv?'Föreningsmedlem':'Club member')}</p><div><b>{m.role}</b><em>{m.organization.defaultCurrency} · {m.organization.countryCode}</em></div></Link>)}</div></main>;
}
