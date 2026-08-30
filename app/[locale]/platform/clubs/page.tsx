import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getPendingOrganizationApplications, isPlatformAdmin} from '@/src/modules/organizations/infrastructure/platform-admin';
import {platformConfig} from '@/src/shared/config/platform';

export default async function PlatformClubs({params, searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {locale}=await params;
  const q=await searchParams;
  if(!platformConfig.supportedLocales.includes(locale as any)) notFound();
  const session=await getCurrentSession();
  if(!isPlatformAdmin(session)) notFound();
  const applications=await getPendingOrganizationApplications();
  const sv=locale==='sv';
  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}/clubs`}>← {sv?'Föreningar':'Clubs'}</Link><span className="rolePill">PLATFORM ADMIN</span></div>
    <section className="simpleHero"><span className="eyebrow">PILOT CONTROL</span><h1>{sv?'Föreningsansökningar':'Club applications'}</h1><p>{sv?'Godkänn bara föreningar som ska ingå i piloten. Godkännande skapar förening, ägarskap, inställningar och onboarding automatiskt.':'Only approve clubs selected for the pilot. Approval creates the club, ownership, settings and onboarding automatically.'}</p></section>
    {q.approved&&<div className="successBanner"><strong>{sv?'Föreningen är skapad':'Club created'}</strong><span>{q.approved}</span></div>}
    <div className="applicationList">{applications.length===0?<section className="accountPanel"><p>{sv?'Inga väntande ansökningar.':'No pending applications.'}</p></section>:applications.map((application:any)=><section className="accountPanel" key={application.id}>
      <div className="panelHeading"><div><span className="eyebrow">{application.status}</span><h2>{application.organization_name}</h2></div><span>{new Date(application.created_at).toLocaleDateString(sv?'sv-SE':'en-GB')}</span></div>
      <div className="applicationMeta"><span>{application.contact_name}</span><span>{application.contact_email}</span><span>{application.country_code}</span><span>{(application.sport_codes??[]).join(', ')}</span>{application.member_count_estimate&&<span>≈ {application.member_count_estimate} {sv?'medlemmar':'members'}</span>}</div>
      {application.notes&&<p>{application.notes}</p>}
      <form className="stackForm compact" action={`/api/v1/platform/organization-applications/${application.id}/approve`} method="post">
        <input type="hidden" name="locale" value={locale}/>
        <label>{sv?'Publik adress':'Public slug'}<input name="slug" defaultValue={application.organization_slug||''} placeholder="orebro-sk" /></label>
        <label>{sv?'Beslutsnotering (valfritt)':'Decision note (optional)'}<input name="decision_note" /></label>
        <button className="primary" type="submit">✓ {sv?'Godkänn och skapa förening':'Approve and create club'}</button>
      </form>
    </section>)}</div>
  </main>;
}
