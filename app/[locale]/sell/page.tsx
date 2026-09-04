import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMarketplaceListing, getMarketplaceReferenceData} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';
import SellPhotoHelper from './sell-photo-helper';
import SellDraftPersistence from './sell-draft-persistence';
import SellPriceHelper from './sell-price-helper';
import SellSubmitGuard from './sell-submit-guard';

const labelFromKey = (key: string) => key.split('.').at(-1)?.replaceAll('_',' ') ?? key;

const errorCopy = (error: string | undefined, sv: boolean) => {
  if (!error) return null;
  if (error === 'validation') return sv
    ? 'Kontrollera rubrik, pris och bilder. Minst en bild krävs och varje bild får vara högst 10 MB.'
    : 'Check the title, price and photos. At least one photo is required and each photo may be up to 10 MB.';
  if (error === 'image') return sv
    ? 'Bilderna kunde inte laddas upp. Prova igen eller välj andra bilder.'
    : 'The photos could not be uploaded. Try again or choose different photos.';
  if (error === 'auth') return sv
    ? 'Din inloggning hann gå ut. Logga in igen så kommer du tillbaka till annonsen.'
    : 'Your session expired. Sign in again and you will return to the listing.';
  return sv
    ? 'Annonsen kunde inte sparas just nu. Försök igen om en stund.'
    : 'The listing could not be saved right now. Please try again shortly.';
};

export default async function SellPage({params,searchParams}:{params:Promise<{locale:string}>,searchParams:Promise<{error?:string;organization?:string;again?:string}>}) {
  const {locale}=await params; const query=await searchParams;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const session=await getCurrentSession();
  const requestedOrganization = typeof query.organization === 'string' ? query.organization : '';
  const requestedAgain = typeof query.again === 'string' ? query.again : '';
  const sellQuery = new URLSearchParams();
  if (requestedOrganization) sellQuery.set('organization', requestedOrganization);
  if (requestedAgain) sellQuery.set('again', requestedAgain);
  const sellPath = `/${locale}/sell${sellQuery.size ? `?${sellQuery.toString()}` : ''}`;
  if (!session) return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att sälja':'Sign in to sell'}</h1><p>{sv?'Efter inloggningen kommer du tillbaka hit och kan fortsätta skapa annonsen.':'After signing in, you will return here and can continue creating the listing.'}</p><Link className="primary inlineAction" href={`/${locale}/login?next=${encodeURIComponent(sellPath)}`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const [refs, reuseSource] = await Promise.all([
    getMarketplaceReferenceData(),
    requestedAgain ? getMarketplaceListing(requestedAgain).catch(() => null) : Promise.resolve(null)
  ]);
  const reusableListing = reuseSource && reuseSource.sellerUserId === session.user.id ? reuseSource : null;
  const reusableOrganizationId = reusableListing?.organizationId ?? '';
  const initialOrganizationId = refs.organizations.some((organization) => organization.id === reusableOrganizationId)
    ? reusableOrganizationId
    : refs.organizations.some((organization) => organization.id === requestedOrganization) ? requestedOrganization : '';
  const initialTeamId = reusableListing?.teamId && refs.teams.some((team) => team.id === reusableListing.teamId) ? reusableListing.teamId : '';
  const initialSportId = reusableListing?.sportId && refs.sports.some((sport) => sport.id === reusableListing.sportId) ? reusableListing.sportId : '';
  const initialOrganization = refs.organizations.find((organization) => organization.id === initialOrganizationId);
  const formError = errorCopy(query.error, sv);

  return <main className="accountShell sellShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link></div>
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'SÄLJ':'SELL'}</span><h1>{sv?'Låt utrustningen spela vidare':'Pass your gear forward'}</h1><p>{initialOrganization ? (sv ? `Annonsen kopplas till ${initialOrganization.name}. Du kan ändra det under Fler uppgifter.` : `The listing will be connected to ${initialOrganization.name}. You can change this under More details.`) : (sv?'Ta en bild, sätt ett pris och publicera. Resten är valfritt.':'Take a photo, set a price and publish. Everything else is optional.')}</p></div></section>

    <div className="sellSteps" aria-label={sv?'Tre steg för att publicera':'Three steps to publish'}>
      <div><strong>1</strong><span>{sv?'Lägg till bild':'Add photo'}</span></div>
      <div><strong>2</strong><span>{sv?'Pris & kort info':'Price & basics'}</span></div>
      <div><strong>3</strong><span>{sv?'Publicera gratis':'Publish free'}</span></div>
    </div>

    {reusableListing&&<section className="closetRun" aria-label={sv?'Snabbt nästa objekt':'Quick next item'}><div><span className="eyebrow">{sv?'RENSA GARDEROBEN':'CLEAR THE CLOSET'}</span><strong>{sv?'Sälj nästa pryl snabbare':'List the next item faster'}</strong><p>{sv?'Vi har behållit förening, lag och sport från förra annonsen. Lägg bara till nya bilder, rubrik och pris.':'We kept the club, team and sport from your last listing. Just add new photos, title and price.'}</p></div><span className="closetRunBadge">2×</span></section>}
    {formError && <div className="formError" role="alert">{formError}</div>}
    <SellDraftPersistence sv={sv} storageKey={`repassing:sell-draft:${locale}`}/>
    <SellSubmitGuard sv={sv}/>
    <form id="sell-listing-form" className="listingForm" action="/api/v1/listings" method="post" encType="multipart/form-data">
      <input type="hidden" name="locale" value={locale}/>
      <input type="hidden" name="organization_context" value={initialOrganizationId}/>

      <div className="formSectionTitle full"><span>1</span><div><h2>{sv?'Börja med en bild':'Start with a photo'}</h2><p>{sv?'Mobilbilder fungerar bra. Första bilden blir annonsens huvudbild.':'Phone photos work well. The first photo becomes the listing cover.'}</p></div></div>
      <SellPhotoHelper sv={sv}/>

      <div className="formSectionTitle full"><span>2</span><div><h2>{sv?'Beskriv prylen kort':'Describe the item briefly'}</h2><p>{sv?'Det räcker med det köparen behöver för att förstå vad du säljer.':'Only include what the buyer needs to understand the item.'}</p></div></div>
      <label><span>{sv?'Rubrik':'Title'} *</span><input id="listing-title" name="title" minLength={3} maxLength={120} required autoComplete="off" placeholder={sv?'Ex. Nike Mercurial fotbollsskor':'E.g. Nike Mercurial football boots'}/></label>
      <label><span>{sv?'Pris':'Price'} *</span><div className="priceInput"><input name="price" type="number" min="0" step="1" required inputMode="numeric" placeholder="150"/><b>kr</b></div><small>{sv?'Du kan ändra priset senare.':'You can change the price later.'}</small></label>
      <input type="hidden" name="currency" value="SEK"/>
      <SellPriceHelper sv={sv}/>
      <label><span>{sv?'Storlek':'Size'}</span><input name="size_label" autoComplete="off" placeholder="152 / M / 38"/><small>{sv?'Lämna tomt om prylen saknar storlek.':'Leave blank if the item has no size.'}</small></label>
      <label><span>{sv?'Skick':'Condition'} *</span><select name="condition" defaultValue="GOOD"><option value="NEW_WITH_TAGS">{sv?'Ny med etikett':'New with tags'}</option><option value="LIKE_NEW">{sv?'Som ny – knappt använd':'Like new – barely used'}</option><option value="GOOD">{sv?'Bra – normalt använd':'Good – normal wear'}</option><option value="USED">{sv?'Använd – tydliga spår':'Used – visible wear'}</option><option value="WELL_USED">{sv?'Väl använd – mycket slitage':'Well used – heavy wear'}</option></select></label>

      <details className="listingAdvanced full" open={Boolean(initialOrganizationId)}><summary>{sv?'Fler uppgifter (valfritt)':'More details (optional)'}</summary><p className="advancedIntro">{sv?'Lägg till mer om det hjälper rätt köpare att hitta prylen.':'Add more if it helps the right buyer find the item.'}</p><div className="listingAdvancedGrid"><label className="full"><span>{sv?'Beskrivning':'Description'}</span><textarea name="description" rows={4} maxLength={2000} placeholder={sv?'Ex. använd en säsong, hämtas vid träning':'E.g. used for one season, pickup at training'}/></label>
      <label><span>{sv?'Förening':'Club'}</span><select name="organization_id" defaultValue={initialOrganizationId}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label><span>{sv?'Lag':'Team'}</span><select name="team_id" defaultValue={initialTeamId}><option value="">{sv?'Inget valt':'None selected'}</option>{refs.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label><span>{sv?'Sport':'Sport'}</span><select name="sport_id" defaultValue={initialSportId}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.sports.map(s=><option key={s.id} value={s.id}>{labelFromKey(s.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Kategori':'Category'}</span><select name="category_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.categories.map(c=><option key={c.id} value={c.id}>{labelFromKey(c.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Varumärke':'Brand'}</span><select name="brand_id" defaultValue=""><option value="">{sv?'Inget valt':'None selected'}</option>{refs.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div></details>

      <div className="publishPanel full"><div><strong>{sv?'Redo att sälja?':'Ready to sell?'}</strong><span>{sv?'Annonsen publiceras direkt och kostar inget att lägga upp.':'The listing is published immediately and is free to post.'}</span></div><button className="primary" type="submit">{sv?'Publicera gratis':'Publish for free'}</button></div>
      <div className="full cancelRow"><Link href={`/${locale}`}>{sv?'Avbryt och gå tillbaka':'Cancel and go back'}</Link></div>
    </form>
  </main>;
}
