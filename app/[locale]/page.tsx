import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {mockListings} from '@/src/modules/marketplace/application/mock-listings';
import {platformConfig} from '@/src/shared/config/platform';
import sv from '@/messages/sv.json';
import en from '@/messages/en.json';

const dictionaries = {sv, en} as const;

const moneyFormatter = (locale: string, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {style:'currency', currency, maximumFractionDigits:0}).format(amountMinor/100);

export default async function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const t = dictionaries[locale as keyof typeof dictionaries];

  return <main>
    <header className="topbar">
      <Link href={`/${locale}`} className="brand" aria-label="Repassing home">
        <Image src="/brand/repassing-logo.png" width={220} height={124} alt="Repassing" priority />
      </Link>
      <div className="desktopSearch"><span>⌕</span><input aria-label={t.search} placeholder={t.search}/></div>
      <div className="headerActions">
        <Link className="clubPicker" href={`/${locale}/clubs`}><span className="clubDot"/>ÖSK Fotboll <span>⌄</span></Link>
        <Link className="lang" href={locale==='sv'?'/en':'/sv'}>{locale==='sv'?'EN':'SV'}</Link>
        <button className="iconButton" aria-label={t.favorites}>♡</button><Link className="profileButton" href={`/${locale}/profile`} aria-label={t.profile}>RP</Link>
      </div>
    </header>

    <section className="marketHero">
      <div className="marketHeroCopy">
        <span className="eyebrow">{t.club}</span>
        <h1>{t.headline}</h1>
        <p>{t.subheadline}</p>
        <div className="heroActions"><button className="primary">＋ {t.sell}</button><button className="secondary">{t.browse}</button></div>
      </div>
      <div className="impactCard">
        <span className="impactLabel">{t.impactLabel}</span>
        <strong>127</strong>
        <p>{t.impactText}</p>
      </div>
    </section>

    <section className="content">
      <div className="mobileSearch"><span>⌕</span><input aria-label={t.search} placeholder={t.search}/></div>
      <div className="quickFilters">
        {[t.filterAll,t.filterFootball,t.filterClothes,t.filterShoes,t.filterFloorball].map((label,i)=><button className={i===0?'filter activeFilter':'filter'} key={label}>{label}</button>)}
      </div>

      <div className="sectionHead">
        <div><span className="eyebrow">{t.inClub}</span><h2>{t.latest}</h2></div>
        <button className="textButton">{t.seeAll} →</button>
      </div>

      <div className="grid">
        {mockListings.map((p)=><article className="card" key={p.id}>
          <div className="productImage"><Image src={p.image} alt="" fill sizes="(max-width:720px) 50vw, 25vw"/></div>
          <button className="heart" aria-label={t.favorite}>♡</button>
          <div className="cardBody">
            <span className="productOrg">{p.organization}</span>
            <h3>{p.title}</h3>
            <p>{p.category} · {t.size} {p.size}</p>
            <strong>{moneyFormatter(locale,p.price.amountMinor,p.price.currency)}</strong>
          </div>
        </article>)}
      </div>

      <section className="valueStrip">
        <div><strong>{t.valueLocal}</strong><span>{t.valueLocalText}</span></div>
        <div><strong>{t.valueFast}</strong><span>{t.valueFastText}</span></div>
        <div><strong>{t.valueCircular}</strong><span>{t.valueCircularText}</span></div>
      </section>
    </section>

    <nav className="bottomNav" aria-label="Huvudnavigation">
      <Link className="active" href={`/${locale}`}>⌂<span>{t.home}</span></Link><button>⌕<span>{t.searchNav}</span></button>
      <button className="sellFab">＋<span>{t.sellNav}</span></button><button>✉<span>{t.messages}</span></button><Link href={`/${locale}/profile`}>○<span>{t.profile}</span></Link>
    </nav>
  </main>;
}
