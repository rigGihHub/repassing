import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMarketplaceListing,getMarketplaceReferenceData} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';
const labelFromKey=(key:string)=>key.split('.').at(-1)?.replaceAll('_',' ')??key;
export default async function EditListingPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound();const sv=locale==='sv';
  const session=await getCurrentSession();if(!session||session.preview)return notFound();
  const [listing,refs]=await Promise.all([getMarketplaceListing(id),getMarketplaceReferenceData()]);
  if(!listing||listing.sellerUserId!==session.user.id||listing.status==='REMOVED')notFound();
  return <main className="accountShell sellShell"><div className="accountTop"><Link href={`/${locale}/listings/${id}`}>← {sv?'Till annonsen':'Back to listing'}</Link><span className="previewBadge">{sv?'REDIGERA':'EDIT'}</span></div>
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'MIN ANNONS':'MY LISTING'}</span><h1>{sv?'Redigera annons':'Edit listing'}</h1><p>{sv?'Ändringarna sparas direkt i marknaden.':'Changes are saved directly to the marketplace.'}</p></div></section>
    <form className="listingForm" action={`/api/v1/listings/${id}`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="intent" value="update"/>
      <label><span>{sv?'Rubrik':'Title'} *</span><input name="title" minLength={3} maxLength={120} required defaultValue={listing.title}/></label>
      <label className="full"><span>{sv?'Beskrivning':'Description'}</span><textarea name="description" rows={5} maxLength={2000} defaultValue={listing.description??''}/></label>
      <label><span>{sv?'Pris':'Price'} *</span><input name="price" type="number" min="0" step="1" required defaultValue={listing.priceMinor/100}/></label>
      <label><span>{sv?'Valuta':'Currency'}</span><select name="currency" defaultValue={listing.currency}>{['SEK','EUR','NOK','DKK','GBP','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label><span>{sv?'Storlek':'Size'}</span><input name="size_label" defaultValue={listing.sizeLabel??''}/></label>
      <label><span>{sv?'Skick':'Condition'} *</span><select name="condition" defaultValue={listing.condition}><option value="NEW_WITH_TAGS">{sv?'Ny med etikett':'New with tags'}</option><option value="LIKE_NEW">{sv?'Som ny':'Like new'}</option><option value="GOOD">{sv?'Bra':'Good'}</option><option value="USED">{sv?'Använd':'Used'}</option><option value="WELL_USED">{sv?'Väl använd':'Well used'}</option></select></label>
      <label><span>{sv?'Förening':'Club'}</span><select name="organization_id" defaultValue={listing.organizationId??''}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label><span>{sv?'Lag':'Team'}</span><select name="team_id" defaultValue={listing.teamId??''}><option value="">{sv?'Inget valt':'None selected'}</option>{refs.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label><span>{sv?'Sport':'Sport'}</span><select name="sport_id" defaultValue={listing.sportId??''}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.sports.map(s=><option key={s.id} value={s.id}>{labelFromKey(s.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Kategori':'Category'}</span><select name="category_id" defaultValue={listing.categoryId??''}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.categories.map(c=><option key={c.id} value={c.id}>{labelFromKey(c.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Varumärke':'Brand'}</span><select name="brand_id" defaultValue={listing.brandId??''}><option value="">{sv?'Inget valt':'None selected'}</option>{refs.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <div className="full formActions"><button className="primary" type="submit">{sv?'Spara ändringar':'Save changes'}</button><Link className="secondary inlineAction" href={`/${locale}/listings/${id}`}>{sv?'Avbryt':'Cancel'}</Link></div>
    </form><p className="panelNote">{sv?'Bilderna från originalannonsen behålls. Bildredigering kommer i ett separat steg.':'Existing photos are kept. Photo editing will follow in a separate step.'}</p>
  </main>;
}
