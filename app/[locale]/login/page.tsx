import Link from 'next/link';
import {notFound} from 'next/navigation';
import {platformConfig} from '@/src/shared/config/platform';
import {runtimeConfig} from '@/src/shared/config/runtime';

export default async function LoginPage({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<Record<string,string|undefined>>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const query = await searchParams;
  const sv = locale === 'sv';
  const enabled = runtimeConfig.authMode === 'supabase' && runtimeConfig.supabaseConfigured;
  const rawNext = query.next ?? '';
  const safeNext = rawNext.startsWith(`/${locale}/`) && !rawNext.startsWith('//') ? rawNext : `/${locale}/profile`;

  return <main className="accountShell authShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className="previewBadge">LIVE AUTH</span></div>
    <section className="authCard">
      <span className="eyebrow">REPASSING ACCOUNT</span>
      <h1>{sv?'Logga in':'Sign in'}</h1>
      <p>{sv?'Vi använder e-postlänk i första produktionsflödet: inget lösenord att glömma och samma identitet fungerar över flera föreningar.':'The first production flow uses email magic links: no password to forget and one identity across organizations.'}</p>
      {query.sent === '1' && <div className="authNotice success">{sv?'Kolla din e-post och öppna inloggningslänken.':'Check your email and open the sign-in link.'}</div>}
      {query.error && <div className="authNotice error">{sv?'Inloggningen kunde inte genomföras. Försök igen.':'Sign-in could not be completed. Try again.'}</div>}
      {!enabled && <div className="authNotice">{sv?'Produktionsinloggning är förberedd men inte aktiverad. Koppla Supabase i Vercel för att slå på den.':'Production authentication is wired but not enabled. Connect Supabase in Vercel to switch it on.'}</div>}
      <form action="/api/v1/auth/magic-link" method="post" className="authForm">
        <input type="hidden" name="locale" value={locale}/>
        <input type="hidden" name="next" value={safeNext}/>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="namn@example.com" required disabled={!enabled}/>
        <button className="primary" type="submit" disabled={!enabled}>{sv?'Skicka inloggningslänk':'Send sign-in link'}</button>
      </form>
      <p className="authFineprint">{sv?'Vid första inloggningen skapas Repassings interna användar-ID automatiskt. Föreningsmedlemskap hålls separat och skyddas med Row Level Security.':'On first sign-in, Repassing creates its provider-independent internal user ID automatically. Organization memberships stay separate and are protected by Row Level Security.'}</p>
    </section>
  </main>;
}
