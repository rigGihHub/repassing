import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {mockListings} from '@/src/modules/marketplace/application/mock-listings';
import {getFavoriteListingIds, getMarketplaceReferenceData, searchMarketplaceListings} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getUnreadNotificationCount} from '@/src/modules/notifications/infrastructure/supabase-notifications';
import {runtimeConfig} from '@/src/shared/config/runtime';
import {platformConfig} from '@/src/shared/config/platform';
import sv from '@/messages/sv.json';
import en from '@/messages/en.json';

const dictionaries = {sv, en} as const;
const cleanKey=(key:string|null|undefined)=>key?.split('.').at(-1)?.replaceAll('_',' ') ?? null;
const moneyFormatter = (locale: string, amountMinor: number, currency: string) =>
  new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {style:'currency', currency, maximumFractionDigits:0}).format(amountMinor/100);
const first=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;
const toMinor=(v:string|undefined)=>{if(!v)return undefined;const n=Number(v.replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):undefined;};

export default async function Home({params,searchParams}: {params: Promise<{locale: string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {locale} = await params;
  const sp=await searchParams;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const t = dictionaries[locale as keyof typeof dictionaries];
  const svLocale=locale==='sv';
  const filters={
    query:first(sp.q)?.trim()||undefined,
    organizationId:first(sp.organization)||undefined,
    teamId:first(sp.team)||undefined,
    sportId:first(sp.sport)||undefined,
    categoryId:first(sp.category)||undefined,
    brandId:first(sp.brand)||undefined,
    minPriceMinor:toMinor(first(sp.minPrice)),
    maxPriceMinor:toMinor(first(sp.maxPrice)),
    currency:'SEK',
    sizeLabel:first(sp.size)?.trim()||undefined,
    limit:48
  };
  const liveMode=runtimeConfig.dataMode==='supabase';
  let liveListings: Awaited<ReturnType<typeof searchMarketplaceListings>> = [];
  let referenceData: Awaited<ReturnType<typeof getMarketplaceReferenceData>> = {organizations:[],teams:[],sports:[],categories:[],brands:[]};
  let session: Awaited<ReturnType<typeof getCurrentSession>> = null;

  if (liveMode) {
    const [listingsResult, referenceResult, sessionResult] = await Promise.allSettled([
      searchMarketplaceListings(filters),
      getMarketplaceReferenceData(),
      getCurrentSession()
    ]);
    if (listingsResult.status === 'fulfilled') liveListings = listingsResult.value;
    else console.error('Marketplace listings unavailable on home page', listingsResult.reason);
    if (referenceResult.status === 'fulfilled') referenceData = referenceResult.value;
    else console.error('Marketplace reference data unavailable on home page', referenceResult.reason);
    if (sessionResult.status === 'fulfilled') session = sessionResult.value;
    else console.error('Session unavailable on home page', sessionResult.reason);
  }

  let favoriteIds = new Set<string>();
  let unreadNotifications = 0;
  if (session && !session.preview) {
    const [favoriteResult, notificationResult] = await Promise.allSettled([
      getFavoriteListingIds(session.user.id),
      getUnreadNotificationCount(session.user.id)
    ]);
    if (favoriteResult.status === 'fulfilled') favoriteIds = favoriteResult.value;
    else console.error('Favorites unavailable on home page', favoriteResult.reason);
    if (notificationResult.status === 'fulfilled') unreadNotifications = notificationResult.value;
    else console.error('Notification count unavailable on home page', notificationResult.reason);
  }
  const hasLiveListings = liveListings.length > 0;
  const hasFilters=Boolean(filters.query||filters.organizationId||filters.teamId||filters.sportId||filters.categoryId||filters.brandId||filters.sizeLabel||filters.minPriceMinor!==undefined||filters.maxPriceMinor!==undefined);
  const qs=new URLSearchParams();Object.entries(sp).forEach(([k,v])=>{const value=first(v);if(value)qs.set(k,value);});const returnPath=`/${locale}${qs.size?`?${qs.toString()}`:''}`;

  return <main>
    <header className="topbar">
      <Link href={`/${locale}`} className="brand" aria-label="Repassing home"><Image src="/brand/repassing-logo.png" width={220} height={124} alt="Repassing" priority /></Link>
      <form className="desktopSearch" action={`/${locale}`} method="get"><span>⌕</span><input name="q" defaultValue={filters.query} aria-label={t.search} placeholder={t.search}/><button className="searchSubmit" type="submit">{svLocale?'Sök':'Search'}</button></form>
      <div className="headerActions">
        <Link className="clubPicker" href={`/${locale}/clubs`}><span className="clubDot"/>ÖSK Fotboll <span>⌄</span></Link>
        <Link className="lang" href={locale==='sv'?'/en':'/sv'}>{locale==='sv'?'EN':'SV'}</Link>
        <Link className="iconButton notificationHeaderButton" href={`/${locale}/notifications`} aria-label={svLocale?'Notifieringar':'Notifications'}>♢{unreadNotifications>0&&<span>{unreadNotifications}</span>}</Link>
        <Link className="iconButton favoritesHeaderButton" href={`/${locale}/favorites`} aria-label={t.favorites}>{favoriteIds.size?'♥':'♡'}{favoriteIds.size>0&&<span>{favoriteIds.size}</span>}</Link>
        <Link className="profileButton" href={`/${locale}/profile`} aria-label={t.profile}>RP</Link>
      </div>
    </header>

    <section className="marketHero">
      <div className="marketHeroCopy"><span className="eyebrow">{t.club}</span><h1>{t.headline}</h1><p>{t.subheadline}</p><div className="heroActions"><Link className="primary inlineAction" href={`/${locale}/sell`}>＋ {t.sell}</Link><a className="secondary inlineAction" href="#marketplace-grid">{t.browse}</a></div></div>
      <div className="impactCard"><span className="impactLabel">{svLocale?'TRÄFFAR':'MATCHES'}</span><strong>{liveListings.length}</strong><p>{hasFilters?(svLocale?'annonser matchar din sökning':'listings match your search'):(svLocale?'aktiva annonser i marknaden just nu':'active listings in the marketplace right now')}</p></div>
    </section>

    <section className="content">
      <form className="mobileSearch" action={`/${locale}`} method="get"><span>⌕</span><input name="q" defaultValue={filters.query} aria-label={t.search} placeholder={t.search}/><button className="searchSubmit" type="submit">{svLocale?'Sök':'Search'}</button></form>
      <form className="marketFilters" action={`/${locale}`} method="get">
        {filters.query&&<input type="hidden" name="q" value={filters.query}/>} 
        <label><span>{svLocale?'Förening':'Club'}</span><select name="organization" defaultValue={filters.organizationId??''}><option value="">{svLocale?'Alla föreningar':'All clubs'}</option>{referenceData.organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
        <label><span>{svLocale?'Sport':'Sport'}</span><select name="sport" defaultValue={filters.sportId??''}><option value="">{svLocale?'Alla sporter':'All sports'}</option>{referenceData.sports.map(s=><option value={s.id} key={s.id}>{cleanKey(s.nameKey)??s.code}</option>)}</select></label>
        <label><span>{svLocale?'Kategori':'Category'}</span><select name="category" defaultValue={filters.categoryId??''}><option value="">{svLocale?'Alla kategorier':'All categories'}</option>{referenceData.categories.map(c=><option value={c.id} key={c.id}>{cleanKey(c.nameKey)??c.code}</option>)}</select></label>
        <label><span>{svLocale?'Storlek':'Size'}</span><input name="size" defaultValue={filters.sizeLabel??''} placeholder={svLocale?'t.ex. 152 eller M':'e.g. 152 or M'}/></label>
        <label><span>{svLocale?'Pris från':'Price from'}</span><input name="minPrice" inputMode="numeric" defaultValue={first(sp.minPrice)??''} placeholder="0"/></label>
        <label><span>{svLocale?'Pris till':'Price to'}</span><input name="maxPrice" inputMode="numeric" defaultValue={first(sp.maxPrice)??''} placeholder="1000"/></label>
        <button className="primary filterApply" type="submit">{svLocale?'Filtrera':'Filter'}</button>
        {hasFilters&&<Link className="secondary filterReset" href={`/${locale}`}>{svLocale?'Rensa':'Clear'}</Link>}
      </form>

      <div className="sectionHead"><div><span className="eyebrow">{hasFilters?(svLocale?'SÖKRESULTAT':'SEARCH RESULTS'):t.inClub}</span><h2>{hasFilters?(svLocale?`${liveListings.length} träffar`:`${liveListings.length} matches`):t.latest}</h2></div><Link className="textButton browseFavorites" href={`/${locale}/favorites`}>{svLocale?'Mina favoriter':'My favorites'} →</Link></div>

      {liveMode&&hasFilters&&!hasLiveListings?<section className="emptyState"><strong>{svLocale?'Inga annonser matchade':'No listings matched'}</strong><p>{svLocale?'Prova att ta bort något filter eller sök med ett bredare ord.':'Try removing a filter or using a broader search term.'}</p><Link className="primary inlineAction" href={`/${locale}`}>{svLocale?'Visa alla annonser':'Show all listings'}</Link></section>:<div className="grid" id="marketplace-grid">
        {hasLiveListings ? liveListings.map((p)=>{const favorite=favoriteIds.has(p.id);return <article className="card" key={p.id}>
          <Link className="productImage livePlaceholder cardImageLink" href={`/${locale}/listings/${p.id}`}>{p.imageUrl ? <img src={p.imageUrl} alt={p.title}/> : <span>RE</span>}</Link>
          <form action={`/api/v1/favorites/${p.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="redirect_to" value={returnPath}/><button className={`heart ${favorite?'favoriteActive':''}`} aria-label={favorite?(svLocale?'Ta bort favorit':'Remove favorite'):t.favorite}>{favorite?'♥':'♡'}</button></form>
          <div className="cardBody"><span className="productOrg">{p.organizationName ?? 'Repassing'}</span><h3><Link className="cardTitleLink" href={`/${locale}/listings/${p.id}`}>{p.title}</Link></h3><p>{cleanKey(p.categoryName) ?? (svLocale?'Sportutrustning':'Sports equipment')} · {t.size} {p.sizeLabel ?? '—'}</p><strong>{moneyFormatter(locale,p.priceMinor,p.currency)}</strong></div>
        </article>}) : !liveMode ? mockListings.map((p)=><article className="card" key={p.id}><div className="productImage livePlaceholder"><span>RE</span></div><button className="heart" aria-label={t.favorite}>♡</button><div className="cardBody"><span className="productOrg">{p.organization}</span><h3>{p.title}</h3><p>{p.category} · {t.size} {p.size}</p><strong>{moneyFormatter(locale,p.price.amountMinor,p.price.currency)}</strong></div></article>) : null}
      </div>}

      <section className="valueStrip"><div><strong>{t.valueLocal}</strong><span>{t.valueLocalText}</span></div><div><strong>{t.valueFast}</strong><span>{t.valueFastText}</span></div><div><strong>{t.valueCircular}</strong><span>{t.valueCircularText}</span></div></section>
    </section>

    <nav className="bottomNav" aria-label="Huvudnavigation"><Link className="active" href={`/${locale}`}>⌂<span>{t.home}</span></Link><a href="#marketplace-grid">⌕<span>{t.searchNav}</span></a><Link className="sellFab" href={`/${locale}/sell`}>＋<span>{t.sellNav}</span></Link><Link href={`/${locale}/favorites`}>{favoriteIds.size?'♥':'♡'}<span>{svLocale?'Favoriter':'Favorites'}</span></Link><Link href={`/${locale}/profile`}>○<span>{t.profile}</span></Link></nav>
  </main>;
}
