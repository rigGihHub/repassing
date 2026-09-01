import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMembershipsForUser} from '@/src/modules/organizations/application/get-memberships';
import {listMyOrganizationApplications} from '@/src/modules/organizations/infrastructure/supabase-applications';
import {platformConfig} from '@/src/shared/config/platform';
import {runtimeConfig} from '@/src/shared/config/runtime';
import {organizationApplicationStatus, organizationRoleLabel} from '@/src/modules/organizations/application/organization-ui';

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {dateStyle: 'medium'}).format(date);
}

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/clubs`);

  const memberships = await getMembershipsForUser(session.user.id);
  const sv = locale === 'sv';
  let applications: Awaited<ReturnType<typeof listMyOrganizationApplications>> = [];
  let applicationsUnavailable = false;

  if (runtimeConfig.dataMode === 'supabase') {
    try {
      applications = await listMyOrganizationApplications();
    } catch {
      applicationsUnavailable = true;
    }
  }

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv ? 'Till marknaden' : 'Back to marketplace'}</Link></div>
    <section className="simpleHero">
      <span className="eyebrow">{sv ? 'För föreningar' : 'For clubs'}</span>
      <h1>{sv ? 'Mina föreningar' : 'My clubs'}</h1>
      <p>{sv ? 'Här ser du dina föreningar och följer intresseanmälningar.' : 'See your clubs and follow submitted applications here.'}</p>
      <Link className="primaryButton" href={`/${locale}/clubs/apply`}>{sv ? 'Anslut en förening' : 'Connect a club'}</Link>
    </section>

    {applicationsUnavailable && <section className="accountPanel applicationStatus applicationNotice">
      <h2>{sv ? 'Ansökningar kan inte visas just nu' : 'Applications are temporarily unavailable'}</h2>
      <p>{sv ? 'Dina anslutna föreningar påverkas inte.' : 'Your connected clubs are not affected.'}</p>
      <Link className="secondaryButton" href={`/${locale}/clubs`}>{sv ? 'Försök igen' : 'Try again'}</Link>
    </section>}

    {applications.length > 0 && <section className="accountPanel applicationStatus">
      <h2>{sv ? 'Mina ansökningar' : 'My applications'}</h2>
      <div className="applicationList">{applications.map((application) => <div className="applicationRow" key={application.id}>
        <div className="applicationMain">
          <b>{application.organizationName}</b>
          <span>{sv ? 'Skickad' : 'Submitted'} {formatDate(application.createdAt, locale)} · {application.contactEmail}</span>
          {application.decisionNote && <p className="applicationDecision">{application.decisionNote}</p>}
        </div>
        {(() => { const status = organizationApplicationStatus(application.status, sv); return <strong className={`applicationBadge applicationBadge-${status.tone}`}>{status.label}</strong>; })()}
      </div>)}</div>
    </section>}

    {memberships.length > 0 ? <div className="clubGrid">{memberships.map((membership) => <Link href={`/${locale}/clubs/${membership.organization.slug}`} className="clubCard" key={membership.id}>
      <span>{sv ? 'Förening' : 'Club'}</span>
      <h2>{membership.organization.name}</h2>
      <p>{membership.teamNames.join(', ') || (sv ? 'Inga lag kopplade ännu' : 'No teams linked yet')}</p>
      <div><b>{organizationRoleLabel(membership.role, sv)}</b><em>{membership.organization.defaultCurrency} · {membership.organization.countryCode}</em></div>
    </Link>)}</div> : !applicationsUnavailable && applications.length === 0 && <section className="accountPanel clubEmptyState">
      <h2>{sv ? 'Ingen förening ansluten ännu' : 'No club connected yet'}</h2>
      <p>{sv ? 'Skicka en intresseanmälan så kan föreningen börja samla sin köp- och säljmarknad på Repassing.' : 'Send an application so your club can start bringing its local buy-and-sell marketplace together on Repassing.'}</p>
      <Link className="primaryButton" href={`/${locale}/clubs/apply`}>{sv ? 'Skicka intresseanmälan' : 'Send application'}</Link>
    </section>}
  </main>;
}
