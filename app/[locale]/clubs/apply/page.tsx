import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {platformConfig} from '@/src/shared/config/platform';
import {ClubApplicationForm} from './club-application-form';

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  if (!await getCurrentSession()) redirect(`/${locale}/login?next=/${locale}/clubs/apply`);
  const sv = locale === 'sv';

  const steps = sv ? [
    ['1', 'Skicka intresseanmälan', 'Fyll i föreningens namn och kontaktperson.'],
    ['2', 'Vi granskar uppgifterna', 'Statusen syns under Mina föreningar.'],
    ['3', 'Föreningen ansluts', 'När ansökan är godkänd kan föreningsytan börja användas.']
  ] : [
    ['1', 'Send an application', 'Add the club name and a contact person.'],
    ['2', 'We review the details', 'You can follow the status under My clubs.'],
    ['3', 'The club is connected', 'Once approved, the club space can start being used.']
  ];

  return <main className="accountShell">
    <div className="accountTop"><Link href={`/${locale}/clubs`}>← {sv ? 'Mina föreningar' : 'My clubs'}</Link></div>
    <section className="simpleHero">
      <span className="eyebrow">{sv ? 'För föreningar' : 'For clubs'}</span>
      <h1>{sv ? 'Ta Repassing till din förening' : 'Bring Repassing to your club'}</h1>
      <p>{sv ? 'Skicka en kostnadsfri intresseanmälan. Det skapas inget abonnemang och du förbinder dig inte till något.' : 'Send a free application. No subscription is created and there is no commitment.'}</p>
    </section>
    <section className="applicationSteps" aria-label={sv ? 'Så går det till' : 'How it works'}>
      {steps.map(([number, title, text]) => <div className="applicationStep" key={number}>
        <span>{number}</span><div><strong>{title}</strong><p>{text}</p></div>
      </div>)}
    </section>
    <section className="accountPanel clubApplyPanel"><ClubApplicationForm locale={locale}/></section>
  </main>;
}
