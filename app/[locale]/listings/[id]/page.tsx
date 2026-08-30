import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getFavoriteListingIds, getMarketplaceListing} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';

const conditionLabel = (condition:string, sv:boolean) => ({
  NEW_WITH_TAGS: sv?'Ny med etikett':'New with tags', LIKE_NEW: sv?'Som ny':'Like new', GOOD: sv?'Bra':'Good', USED: sv?'Använd':'Used', WELL_USED: sv?'Väl använd':'Well used'
}[condition] ?? condition);
const statusLabel = (status:string,sv:boolean)=>({ACTIVE:sv?'Aktiv':'Active',RESERVED:sv?'Reserverad':'Reserved',SOLD:sv?'Såld':'Sold',COMPLETED:sv?'Slutförd':'Completed',CANCELLED:sv?'Avbruten':'Cancelled',DRAFT:sv?'Utkast':'Draft'}[status]??status);
const cleanKey=(key:string|null)=>key?.split('.').at(-1)?.replaceAll('_',' ') ?? null;

export default async function ListingPage({params}:{params:Promise<{locale:string;id:string}>}) {
  const {locale,id}=await params;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const listing=await getMarketplaceListing(id);
  if (!listing || listing.status==='REMOVED') notFound();
  const session=await getCurrentSession();
  const isOwner=!!session && !session.preview && session.user.id===listing.sellerUserId;
  const favoriteIds=session&&!session.preview?await getFavoriteListingIds(session.user.id):new Set<string>();
  const isFavorite=favoriteIds.has(listing.id);
  const money=new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:listing.currency,maximumFractionDigits:0}).format(listing.priceMinor/100);
  return <main className="accountShell listingDetailShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className={`statusPill status-${listing.status.toLowerCase()}`}>{statusLabel(listing.status,sv)}</span></div>
    <section className="listingDetailGrid">
      <div className="listingGallery">
        <div className="galleryMain">{listing.imageUrls[0]?<img src={listing.imageUrls[0]} alt={listing.title}/>:<div className="galleryFallback">RE</div>}</div>
        {listing.imageUrls.length>1&&<div className="galleryThumbs">{listing.imageUrls.slice(1).map((url,i)=><img key={url} src={url} alt={`${listing.title} ${i+2}`}/>)}</div>}
      </div>
      <aside className="listingInfoPanel">
        <span className="eyebrow">{listing.organizationName ?? (sv?'REPASSING MARKNAD':'REPASSING MARKET')}</span>
        <h1>{listing.title}</h1><strong className="detailPrice">{money}</strong>
        <dl className="detailFacts">
          <div><dt>{sv?'Skick':'Condition'}</dt><dd>{conditionLabel(listing.condition,sv)}</dd></div>
          <div><dt>{sv?'Storlek':'Size'}</dt><dd>{listing.sizeLabel||'—'}</dd></div>
          {listing.brandName&&<div><dt>{sv?'Märke':'Brand'}</dt><dd>{listing.brandName}</dd></div>}
          {listing.categoryName&&<div><dt>{sv?'Kategori':'Category'}</dt><dd>{cleanKey(listing.categoryName)}</dd></div>}
          {listing.sportName&&<div><dt>{sv?'Sport':'Sport'}</dt><dd>{cleanKey(listing.sportName)}</dd></div>}
          {listing.teamName&&<div><dt>{sv?'Lag':'Team'}</dt><dd>{listing.teamName}</dd></div>}
        </dl>
        {listing.description&&<div className="listingDescription"><h2>{sv?'Beskrivning':'Description'}</h2><p>{listing.description}</p></div>}
        {!isOwner&&listing.status==='ACTIVE'&&<div className="buyerActions"><div className="detailActions"><form action={`/api/v1/favorites/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="redirect_to" value={`/${locale}/listings/${listing.id}`}/><button className={`secondary detailFavorite ${isFavorite?'favoriteActive':''}`} type="submit">{isFavorite?'♥':'♡'} {isFavorite?(sv?'Sparad':'Saved'):(sv?'Spara favorit':'Save favorite')}</button></form></div><form className="reservationForm" action="/api/v1/reservations" method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="listing_id" value={listing.id}/><label><span>{sv?'Meddelande till säljaren':'Message to seller'}</span><textarea name="message" rows={3} maxLength={5000} defaultValue={sv?'Hej! Jag vill gärna reservera den här. När passar det att lämna över?':'Hi! I would like to reserve this. When would handoff work for you?'}/></label><button className="primary detailCta" type="submit">{sv?'Reservera & kontakta säljaren':'Reserve & contact seller'}</button><small>{sv?'Varan reserveras. Ingen betalning sker ännu.':'The item is reserved. No payment is taken yet.'}</small></form></div>}
        {isOwner&&<div className="ownerControls"><Link className="primary inlineAction" href={`/${locale}/listings/${listing.id}/edit`}>{sv?'Redigera annons':'Edit listing'}</Link>
          <div className="ownerStatusActions">
            {listing.status!=='ACTIVE'&&<form action={`/api/v1/listings/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="intent" value="status"/><input type="hidden" name="status" value="ACTIVE"/><button className="secondary" type="submit">{sv?'Aktivera':'Set active'}</button></form>}
            {listing.status!=='RESERVED'&&<form action={`/api/v1/listings/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="intent" value="status"/><input type="hidden" name="status" value="RESERVED"/><button className="secondary" type="submit">{sv?'Markera reserverad':'Mark reserved'}</button></form>}
            {listing.status!=='SOLD'&&<form action={`/api/v1/listings/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="intent" value="status"/><input type="hidden" name="status" value="SOLD"/><button className="secondary" type="submit">{sv?'Markera såld':'Mark sold'}</button></form>}
          </div>
          <form className="dangerZone" action={`/api/v1/listings/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="intent" value="remove"/><button className="dangerButton" type="submit">{sv?'Radera annons':'Delete listing'}</button></form>
        </div>}
      </aside>
    </section>
  </main>;
}
