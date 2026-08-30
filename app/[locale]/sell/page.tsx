import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMarketplaceReferenceData} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';

const labelFromKey = (key: string) => key.split('.').at(-1)?.replaceAll('_',' ') ?? key;

export default async function SellPage({params,searchParams}:{params:Promise<{locale:string}>,searchParams:Promise<{error?:string}>}) {
  const {locale}=await params; const query=await searchParams;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const session=await getCurrentSession();
  if (!session) return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att sälja':'Sign in to sell'}</h1><Link className="primary inlineAction" href={`/${locale}/login`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const refs=await getMarketplaceReferenceData();
  return <main className="accountShell sellShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><span className="previewBadge">LIVE MARKETPLACE</span></div>
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'SÄLJ':'SELL'}</span><h1>{sv?'Låt utrustningen spela vidare':'Pass your gear forward'}</h1><p>{sv?'Skapa en riktig annons. Den publiceras direkt i marknaden.':'Create a real listing. It is published directly to the marketplace.'}</p></div></section>
    {query.error && <div className="formError">{sv?'Annonsen kunde inte sparas. Kontrollera uppgifterna och försök igen.':'The listing could not be saved. Check the fields and try again.'}</div>}
    <form className="listingForm" action="/api/v1/listings" method="post">
      <input type="hidden" name="locale" value={locale}/>
      <label><span>{sv?'Rubrik':'Title'} *</span><input name="title" minLength={3} maxLength={120} required placeholder={sv?'Ex. Nike Mercurial fotbollsskor':'E.g. Nike Mercurial football boots'}/></label>
      <label className="full"><span>{sv?'Beskrivning':'Description'}</span><textarea name="description" rows={5} maxLength={2000} placeholder={sv?'Storlek, modell och annan relevant information':'Size, model and other relevant information'}/></label>
      <label><span>{sv?'Pris':'Price'} *</span><input name="price" type="number" min="0" step="1" required placeholder="150"/></label>
      <label><span>{sv?'Valuta':'Currency'}</span><select name="currency" defaultValue="SEK"><option>SEK</option><option>EUR</option><option>NOK</option><option>DKK</option><option>GBP</option><option>USD</option></select></label>
      <label><span>{sv?'Storlek':'Size'}</span><input name="size_label" placeholder="152 / M / 38"/></label>
      <label><span>{sv?'Skick':'Condition'} *</span><select name="condition" defaultValue="GOOD"><option value="NEW_WITH_TAGS">{sv?'Ny med etikett':'New with tags'}</option><option value="LIKE_NEW">{sv?'Som ny':'Like new'}</option><option value="GOOD">{sv?'Bra':'Good'}</option><option value="USED">{sv?'Använd':'Used'}</option><option value="WELL_USED">{sv?'Väl använd':'Well used'}</option></select></label>
      <label><span>{sv?'Förening':'Club'}</span><select name="organization_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label><span>{sv?'Lag':'Team'}</span><select name="team_id" defaultValue=""><option value="">{sv?'Inget valt':'None selected'}</option>{refs.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label><span>{sv?'Sport':'Sport'}</span><select name="sport_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.sports.map(s=><option key={s.id} value={s.id}>{labelFromKey(s.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Kategori':'Category'}</span><select name="category_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.categories.map(c=><option key={c.id} value={c.id}>{labelFromKey(c.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Varumärke':'Brand'}</span><select name="brand_id" defaultValue=""><option value="">{sv?'Inget valt':'None selected'}</option>{refs.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <div className="full formActions"><button className="primary" type="submit">{sv?'Publicera annons':'Publish listing'}</button><Link className="secondary inlineAction" href={`/${locale}`}>{sv?'Avbryt':'Cancel'}</Link></div>
    </form>
    <p className="panelNote">{sv?'Bildhantering kommer i nästa steg. Den här releasen verifierar den kompletta live-kedjan för användare och annonser.':'Image handling comes next. This release verifies the complete live user and listing flow.'}</p>
  </main>;
}
