import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {mockListings} from '@/src/modules/marketplace/application/mock-listings';
import {getFavoriteListingIds, getMarketplaceBrowseReferenceData, searchMarketplaceListings} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
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
  let referenceData: Awaited<ReturnType<typeof getMarketplaceBrowseReferenceData>> = {organizations:[],teams:[],sports:[],categories:[],brands:[]};
  let session: Awaited<ReturnType<typeof getCurrentSession>> = null;
  let marketplaceUnavailable = false;

  if (liveMode) {
    const [listingsResult, referenceResult, sessionResult] = await Promise.allSettled([
      searchMarketplaceListings(filters),
      getMarketplaceBrowseReferenceData(),
      getCurrentSession()
    ]);
    if (listingsResult.status === 'fulfilled') liveListings = listingsResult.value;
    else { marketplaceUnavailable = true; console.error('Marketplace listings unavailable on home page', listingsResult.reason); }
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
  const activeOrganization = referenceData.organizations.find((organization)=>organization.id===filters.organizationId);
  const clubLabel = activeOrganization?.name ?? (svLocale?'Alla föreningar':'All clubs');
  const hasFilters=Boolean(filters.query||filters.organizationId||filters.teamId||filters.sportId||filters.categoryId||filters.brandId||filters.sizeLabel||filters.minPriceMinor!==undefined||filters.maxPriceMinor!==undefined);
  const lowSupply = liveMode && !marketplaceUnavailable && !hasFilters && liveListings.length > 0 && liveListings.length <= 10;
  const sellHref = activeOrganization ? `/${locale}/sell?organization=${activeOrganization.id}` : `/${locale}/sell`;
  const supplyMarketName = activeOrganization?.name ?? (svLocale?'marknaden':'the marketplace');
  const activeFilterCount=[filters.organizationId,filters.teamId,filters.sportId,filters.categoryId,filters.brandId,filters.sizeLabel,filters.minPriceMinor,filters.maxPriceMinor].filter((value)=>value!==undefined&&value!==null&&value!=='').length;
  const qs=new URLSearchParams();Object.entries(sp).forEach(([k,v])=>{const value=first(v);if(value)qs.set(k,value);});const returnPath=`/${locale}${qs.size?`?${qs.toString()}`:''}`;

  return <main>
    <header className="topbar">
      <Link href={`/${locale}`} className="brand" aria-label="Repassing home"><Image src="/brand/repassing-logo.png" width={220} height={124} alt="Repassing" priority /></Link>
      <form className="desktopSearch" action={`/${locale}`} method="get"><span>⌕</span><input name="q" defaultValue={filters.query} aria-label={t.search} placeholder={t.search}/><button className="searchSubmit" type="submit">{svLocale?'Sök':'Search'}</button></form>
      <div className="headerActions">
        <Link className="clubPicker" href={`/${locale}/clubs`}><span className="clubDot"/>{activeOrganization?.name ?? (svLocale?'Föreningar':'Clubs')} <span>⌄</span></Link>
        <Link className="lang" href={locale==='sv'?'/en':'/sv'}>{locale==='sv'?'EN':'SV'}</Link>
        <Link className="iconButton notificationHeaderButton" href={`/${locale}/notifications`} aria-label={svLocale?'Notifieringar':'Notifications'}>♢{unreadNotifications>0&&<span>{unreadNotifications}</span>}</Link>
        <Link className="iconButton favoritesHeaderButton" href={`/${locale}/favorites`} aria-label={t.favorites}>{favoriteIds.size?'♥':'♡'}{favoriteIds.size>0&&<span>{favoriteIds.size}</span>}</Link>
        <Link className="profileButton" href={`/${locale}/profile`} aria-label={t.profile}>RP</Link>
      </div>
    </header>

    <section className="marketHero compactMarketHero">
      <div className="marketHeroCopy"><span className="eyebrow">{clubLabel}</span><h1>{t.headline}</h1><p>{t.subheadline}</p><div className="heroActions"><Link className="primary inlineAction" href={sellHref}>＋ {t.sell}</Link><a className="secondary inlineAction" href="#marketplace-grid">{t.browse}</a></div></div>
      <div className="impactCard"><span className="impactLabel">{svLocale?'TRÄFFAR':'MATCHES'}</span><strong>{marketplaceUnavailable?'—':liveListings.length}</strong><p>{marketplaceUnavailable?(svLocale?'Marknadsdata kunde inte hämtas just nu':'Marketplace data is temporarily unavailable'):hasFilters?(svLocale?'annonser matchar din sökning':'listings match your search'):(svLocale?'aktiva annonser i marknaden just nu':'active listings in the marketplace right now')}</p></div>
    </section>

    <section className="content">
      <form className="mobileSearch" action={`/${locale}`} method="get"><span>⌕</span><input name="q" defaultValue={filters.query} aria-label={t.search} placeholder={t.search}/><button className="searchSubmit" type="submit">{svLocale?'Sök':'Search'}</button></form>
      <details className="filterDisclosure" open={hasFilters}>
        <summary><span>{svLocale?'Filter':'Filters'}</span>{activeFilterCount>0&&<b>{activeFilterCount}</b>}<span className="filterHint">{svLocale?'Förening, sport, storlek, pris':'Club, sport, size, price'}</span><span className="filterChevron">⌄</span></summary>
        <form className="marketFilters" action={`/${locale}`} method="get">
          {filters.query&&<input type="hidden" name="q" value={filters.query}/>}
          <label><span>{svLocale?'Förening':'Club'}</span><select name="organization" defaultValue={filters.organizationId??''}><option value="">{svLocale?'Alla föreningar':'All clubs'}</option>{referenceData.organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
          <label><span>{svLocale?'Sport':'Sport'}</span><select name="sport" defaultValue={filters.sportId??''}><option value="">{svLocale?'Alla sporter':'All sports'}</option>{referenceData.sports.map(s=><option value={s.id} key={s.id}>{cleanKey(s.nameKey)??s.code}</option>)}</select></label>
          <label><span>{svLocale?'Kategori':'Category'}</span><select name="category" defaultValue={filters.categoryId??''}><option value="">{svLocale?'Alla kategorier':'All categories'}</option>{referenceData.categories.map(c=><option value={c.id} key={c.id}>{cleanKey(c.nameKey)??c.code}</option>)}</select></label>
          <label><span>{svLocale?'Storlek':'Size'}</span><input name="size" defaultValue={filters.sizeLabel??''} placeholder={svLocale?'t.ex. 152 eller M':'e.g. 152 or M'}/></label>
          <label><span>{svLocale?'Pris från':'Price from'}</span><input name="minPrice" inputMode="numeric" defaultValue={first(sp.minPrice)??''} placeholder="0"/></label>
          <label><span>{svLocale?'Pris till':'Price to'}</span><input name="maxPrice" inputMode="numeric" defaultValue={first(sp.maxPrice)??''} placeholder="1000"/></label>
          <button className="primary filterApply" type="submit">{svLocale?'Visa resultat':'Show results'}</button>
          {hasFilters&&<Link className="secondary filterReset" href={`/${locale}`}>{svLocale?'Rensa':'Clear'}</Link>}
        </form>
      </details>

      <div className="sectionHead"><div><span className="eyebrow">{hasFilters?(svLocale?'SÖKRESULTAT':'SEARCH RESULTS'):t.inClub}</span><h2>{hasFilters?(svLocale?`${liveListings.length} träffar`:`${liveListings.length} matches`):t.latest}</h2></div><Link className="textButton browseFavorites" href={`/${locale}/favorites`}>{svLocale?'Mina favoriter':'My favorites'} →</Link></div>

      {liveMode&&marketplaceUnavailable?<section className="emptyState"><strong>{svLocale?'Marknaden kunde inte laddas':'Marketplace unavailable'}</strong><p>{svLocale?'Försök igen om en stund. Övriga delar av Repassing fungerar fortfarande.':'Please try again shortly. The rest of Repassing is still available.'}</p><Link className="primary inlineAction" href={`/${locale}`}>{svLocale?'Försök igen':'Try again'}</Link></section>:liveMode&&hasFilters&&!hasLiveListings?<section className="emptyState"><strong>{svLocale?'Inga annonser matchade':'No listings matched'}</strong><p>{svLocale?'Prova att ta bort något filter eller sök med ett bredare ord.':'Try removing a filter or using a broader search term.'}</p><Link className="primary inlineAction" href={`/${locale}`}>{svLocale?'Visa alla annonser':'Show all listings'}</Link></section>:liveMode&&!hasFilters&&!hasLiveListings?<section className="emptyState supplyEmpty" id="marketplace-grid"><span className="emptyEyebrow">{svLocale?'DIN MARKNAD BÖRJAR HÄR':'YOUR MARKET STARTS HERE'}</span><strong>{svLocale?`Bli först med att lägga upp något i ${supplyMarketName}`:`Be the first to list something in ${supplyMarketName}`}</strong><p>{svLocale?'Ta ett foto, sätt pris och publicera. Det behövs inga långa produkttexter för att komma igång.':'Take a photo, set a price and publish. You do not need a long product description to get started.'}</p><div className="supplySteps"><span><b>1</b>{svLocale?'Foto':'Photo'}</span><span><b>2</b>{svLocale?'Pris':'Price'}</span><span><b>3</b>{svLocale?'Publicera':'Publish'}</span></div><div className="emptyActions"><Link className="primary inlineAction" href={sellHref}>＋ {svLocale?'Sälj första prylen':'List first item'}</Link><Link className="secondary inlineAction" href={`/${locale}/clubs`}>{svLocale?'Välj förening':'Choose club'}</Link></div></section>:<>{lowSupply&&<section className="supplyActivation" aria-label={svLocale?'Hjälp marknaden växa':'Help the marketplace grow'}><div><span className="emptyEyebrow">{svLocale?'MARKNADEN ÄR IGÅNG':'THE MARKETPLACE IS LIVE'}</span><strong>{svLocale?`${liveListings.length} ${liveListings.length===1?'annons':'annonser'} just nu — nästa kan vara din`:`${liveListings.length} ${liveListings.length===1?'listing':'listings'} live — yours could be next`}</strong><p>{svLocale?'Fler relevanta prylar gör det lättare för familjer att både hitta och sälja inom samma idrottsgemenskap.':'More relevant gear makes it easier for families to both buy and sell within the same sports community.'}</p></div><Link className="primary inlineAction" href={sellHref}>＋ {svLocale?'Lägg upp en pryl':'List an item'}</Link></section>}<div className="grid" id="marketplace-grid">
        {hasLiveListings ? liveListings.map((p)=>{const favorite=favoriteIds.has(p.id);return <article className="card" key={p.id}>
          <Link prefetch={false} className="productImage livePlaceholder cardImageLink" href={`/${locale}/listings/${p.id}`}>{p.imageUrl ? <Image src={p.imageUrl} alt={p.title} fill sizes="(max-width: 620px) 46vw, (max-width: 900px) 44vw, 280px" quality={72}/> : <span>RE</span>}</Link>
          <form action={`/api/v1/favorites/${p.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="redirect_to" value={returnPath}/><button className={`heart ${favorite?'favoriteActive':''}`} aria-label={favorite?(svLocale?'Ta bort favorit':'Remove favorite'):t.favorite}>{favorite?'♥':'♡'}</button></form>
          <div className="cardBody"><strong className="cardPrice">{moneyFormatter(locale,p.priceMinor,p.currency)}</strong><h3><Link prefetch={false} className="cardTitleLink" href={`/${locale}/listings/${p.id}`}>{p.title}</Link></h3><p className="cardMeta">{cleanKey(p.categoryName) ?? (svLocale?'Sportutrustning':'Sports equipment')}<span aria-hidden="true">·</span>{t.size} {p.sizeLabel ?? '—'}</p><span className="productOrg">{p.organizationName ?? 'Repassing'}</span></div>
        </article>}) : !liveMode ? mockListings.map((p)=><article className="card" key={p.id}><div className="productImage livePlaceholder"><span>RE</span></div><button className="heart" aria-label={t.favorite}>♡</button><div className="cardBody"><span className="productOrg">{p.organization}</span><h3>{p.title}</h3><p>{p.category} · {t.size} {p.size}</p><strong>{moneyFormatter(locale,p.price.amountMinor,p.price.currency)}</strong></div></article>) : null}
      </div></>}

    </section>

    <nav className="bottomNav" aria-label={svLocale?'Huvudnavigation':'Main navigation'}><Link className="active" href={`/${locale}`}>⌂<span>{t.home}</span></Link><a href="#marketplace-grid">⌕<span>{t.searchNav}</span></a><Link className="sellFab" href={`/${locale}/sell`}>＋<span>{t.sellNav}</span></Link><Link href={`/${locale}/orders`}>⇄<span>{svLocale?'Affärer':'Deals'}</span></Link><Link href={`/${locale}/profile`}>○<span>{t.profile}</span></Link></nav>
  </main>;
}
