import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getFavoriteListingIds, getMarketplaceListing} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';
import SellDraftClear from './sell-draft-clear';
import ReservationSubmitGuard from './reservation-submit-guard';

const conditionLabel = (condition:string, sv:boolean) => ({
  NEW_WITH_TAGS: sv?'Ny med etikett':'New with tags', LIKE_NEW: sv?'Som ny':'Like new', GOOD: sv?'Bra':'Good', USED: sv?'Använd':'Used', WELL_USED: sv?'Väl använd':'Well used'
}[condition] ?? condition);
const statusLabel = (status:string,sv:boolean)=>({ACTIVE:sv?'Aktiv':'Active',RESERVED:sv?'Reserverad':'Reserved',SOLD:sv?'Såld':'Sold',COMPLETED:sv?'Slutförd':'Completed',CANCELLED:sv?'Avbruten':'Cancelled',DRAFT:sv?'Utkast':'Draft'}[status]??status);
const cleanKey=(key:string|null)=>key?.split('.').at(-1)?.replaceAll('_',' ') ?? null;

export default async function ListingPage({params,searchParams}:{params:Promise<{locale:string;id:string}>;searchParams:Promise<{error?:string;created?:string}>}) {
  const {locale,id}=await params;
  const query=await searchParams;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const listing=await getMarketplaceListing(id);
  if (!listing || listing.status==='REMOVED') notFound();
  const session=await getCurrentSession();
  const isOwner=!!session && !session.preview && session.user.id===listing.sellerUserId;
  const favoriteIds=session&&!session.preview?await getFavoriteListingIds(session.user.id):new Set<string>();
  const isFavorite=favoriteIds.has(listing.id);
  const money=new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:listing.currency,maximumFractionDigits:0}).format(listing.priceMinor/100);
  const purchaseError=query.error?({own:sv?'Du kan inte köpa din egen annons.':'You cannot buy your own listing.',unavailable:sv?'Någon annan hann före. Annonsen är inte längre tillgänglig.':'Someone else got there first. The listing is no longer available.',missing:sv?'Annonsen finns inte längre.':'The listing is no longer available.',session:sv?'Din inloggning behöver förnyas. Logga in igen och försök på nytt.':'Your session needs to be renewed. Sign in again and try again.',message:sv?'Meddelandet är för långt. Korta ner det och försök igen.':'The message is too long. Shorten it and try again.',temporary:sv?'Ett tillfälligt fel uppstod. Ingen affär har startats — försök igen om en stund.':'A temporary error occurred. No deal was started — please try again shortly.'} as Record<string,string>)[query.error]??(sv?'Det gick inte att starta affären. Försök igen.':'Could not start the deal. Please try again.'):null;
  return <main className="accountShell listingDetailShell">
    {query.created==='1'&&isOwner&&<SellDraftClear locale={locale}/>}
    {query.created==='1'&&isOwner&&<section className="listingCreatedBanner" role="status"><div><span className="eyebrow">{sv?'PUBLICERAD':'PUBLISHED'}</span><strong>{sv?'Annonsen är ute – har du en pryl till?':'Your listing is live — got another item?'}</strong><p>{sv?'Förening, lag och sport kan följa med till nästa annons så du slipper välja samma saker igen.':'Club, team and sport can carry over to your next listing so you do not have to select them again.'}</p></div><Link className="primary inlineAction" href={`/${locale}/sell?again=${listing.id}`}>{sv?'Sälj en till':'Sell another'}</Link></section>}
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
        {!isOwner&&listing.status==='ACTIVE'&&<div className="buyerActions buyerPurchaseCard">
          <div className="purchaseIntro">
            <span className="eyebrow">{sv?'ENKELT KÖP':'SIMPLE PURCHASE'}</span>
            <h2>{sv?'Vill du ha den?':'Want it?'}</h2>
            <p>{sv?'Skicka en köpintresseförfrågan. Annonsen reserveras medan ni bestämmer när och var ni ska ses.':'Send a purchase request. The listing is reserved while you agree when and where to meet.'}</p>
          </div>
          {purchaseError&&<div className="inlineError" role="alert">{purchaseError}</div>}
          <div className="purchaseSteps" aria-label={sv?'Så går köpet till':'How the purchase works'}>
            <div><strong>1</strong><span>{sv?'Visa intresse':'Show interest'}</span></div>
            <div><strong>2</strong><span>{sv?'Bestäm överlämning':'Agree handoff'}</span></div>
            <div><strong>3</strong><span>{sv?'Bekräfta klart':'Confirm done'}</span></div>
          </div>
          <ReservationSubmitGuard sv={sv}/><form className="reservationForm" action="/api/v1/reservations" method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="listing_id" value={listing.id}/><label><span>{sv?'Meddelande till säljaren (valfritt)':'Message to seller (optional)'}</span><textarea name="message" rows={2} maxLength={5000} placeholder={sv?'Till exempel: Kan vi ses efter träningen på torsdag?':'For example: Could we meet after practice on Thursday?'}/></label><button className="primary detailCta" type="submit">{sv?'Jag vill köpa':'I want to buy'}</button><small>{sv?'Ingen betalning görs när du trycker här.':'No payment is made when you press this button.'}</small></form>
          <form className="saveListingForm" action={`/api/v1/favorites/${listing.id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="redirect_to" value={`/${locale}/listings/${listing.id}`}/><button className={`secondary detailFavorite ${isFavorite?'favoriteActive':''}`} type="submit">{isFavorite?'♥':'♡'} {isFavorite?(sv?'Sparad':'Saved'):(sv?'Spara till senare':'Save for later')}</button></form>
          {listing.organizationName&&<div className="clubTrustNote"><strong>{sv?'Föreningsnära':'Club-local'}</strong><span>{sv?`Annonsen är kopplad till ${listing.organizationName}.`:`This listing is connected to ${listing.organizationName}.`}</span></div>}
        </div>}
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
