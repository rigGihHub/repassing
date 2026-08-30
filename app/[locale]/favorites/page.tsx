import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getFavoriteListings} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';

const cleanKey=(key:string|null)=>key?.split('.').at(-1)?.replaceAll('_',' ') ?? null;

export default async function FavoritesPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const session=await getCurrentSession();
  if (!session || session.preview) return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att spara favoriter':'Sign in to save favorites'}</h1><p>{sv?'Dina sparade annonser följer med på alla enheter.':'Your saved listings follow you across devices.'}</p><Link className="primary inlineAction" href={`/${locale}/login`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const listings=await getFavoriteListings(session.user.id);
  return <main className="accountShell favoritesPage">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className="previewBadge favoriteCountBadge">♥ {listings.length}</span></div>
    <section className="simpleHero"><span className="eyebrow">{sv?'SPARAT':'SAVED'}</span><h1>{sv?'Mina favoriter':'My favorites'}</h1><p>{sv?'Samla sådant du vill hålla koll på och hitta tillbaka direkt.':'Keep an eye on items you like and return to them instantly.'}</p></section>
    {listings.length===0?<section className="emptyState"><strong>{sv?'Inga favoriter ännu':'No favorites yet'}</strong><p>{sv?'Tryck på hjärtat på en annons för att spara den här.':'Tap the heart on a listing to save it here.'}</p><Link className="primary inlineAction" href={`/${locale}`}>{sv?'Utforska annonser':'Browse listings'}</Link></section>:<div className="grid favoritesGrid">{listings.map((p)=><article className="card" key={p.id}>
      <Link className="productImage livePlaceholder cardImageLink" href={`/${locale}/listings/${p.id}`}>{p.imageUrl?<img src={p.imageUrl} alt={p.title}/>:<span>RE</span>}</Link>
      <form action={`/api/v1/favorites/${p.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="redirect_to" value={`/${locale}/favorites`}/><button className="heart favoriteActive" aria-label={sv?'Ta bort favorit':'Remove favorite'}>♥</button></form>
      <div className="cardBody"><span className="productOrg">{p.organizationName??'Repassing'}</span><h3><Link className="cardTitleLink" href={`/${locale}/listings/${p.id}`}>{p.title}</Link></h3><p>{cleanKey(p.categoryName)??(sv?'Sportutrustning':'Sports equipment')} · {sv?'Storlek':'Size'} {p.sizeLabel??'—'}</p><strong>{new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(p.priceMinor/100)}</strong></div>
    </article>)}</div>}
  </main>;
}
