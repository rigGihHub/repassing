import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getMarketplaceReferenceData} from '@/src/modules/marketplace/infrastructure/supabase-marketplace';
import {platformConfig} from '@/src/shared/config/platform';

const labelFromKey = (key: string) => key.split('.').at(-1)?.replaceAll('_',' ') ?? key;

export default async function SellPage({params,searchParams}:{params:Promise<{locale:string}>,searchParams:Promise<{error?:string;organization?:string}>}) {
  const {locale}=await params; const query=await searchParams;
  if (!platformConfig.supportedLocales.includes(locale as 'sv'|'en')) notFound();
  const sv=locale==='sv';
  const session=await getCurrentSession();
  const requestedOrganization = typeof query.organization === 'string' ? query.organization : '';
  const sellPath = `/${locale}/sell${requestedOrganization ? `?organization=${encodeURIComponent(requestedOrganization)}` : ''}`;
  if (!session) return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att sälja':'Sign in to sell'}</h1><p>{sv?'Efter inloggningen kommer du tillbaka hit och kan fortsätta skapa annonsen.':'After signing in, you will return here and can continue creating the listing.'}</p><Link className="primary inlineAction" href={`/${locale}/login?next=${encodeURIComponent(sellPath)}`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const refs=await getMarketplaceReferenceData();
  const initialOrganizationId = refs.organizations.some((organization) => organization.id === requestedOrganization) ? requestedOrganization : '';
  const initialOrganization = refs.organizations.find((organization) => organization.id === initialOrganizationId);
  return <main className="accountShell sellShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link></div>
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'SÄLJ':'SELL'}</span><h1>{sv?'Låt utrustningen spela vidare':'Pass your gear forward'}</h1><p>{initialOrganization ? (sv ? `Annonsen kopplas till ${initialOrganization.name}. Du kan ändra det under Fler uppgifter.` : `The listing will be connected to ${initialOrganization.name}. You can change this under More details.`) : (sv?'Foto, pris och några enkla uppgifter – sedan är du klar.':'Photo, price and a few simple details — then you are done.')}</p></div></section>
    {query.error && <div className="formError">{sv?'Annonsen kunde inte sparas. Kontrollera uppgifterna och försök igen.':'The listing could not be saved. Check the fields and try again.'}</div>}
    <form className="listingForm" action="/api/v1/listings" method="post" encType="multipart/form-data">
      <input type="hidden" name="locale" value={locale}/>
      <label><span>{sv?'Rubrik':'Title'} *</span><input name="title" minLength={3} maxLength={120} required placeholder={sv?'Ex. Nike Mercurial fotbollsskor':'E.g. Nike Mercurial football boots'}/></label>
      <label className="full"><span>{sv?'Bilder':'Photos'} *</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple required/><small>{sv?'Lägg till upp till 6 bilder. Max 10 MB per bild.':'Add up to 6 photos. Max 10 MB per photo.'}</small></label>
      <label><span>{sv?'Pris':'Price'} *</span><input name="price" type="number" min="0" step="1" required placeholder="150"/></label>
      <input type="hidden" name="currency" value="SEK"/>
      <label><span>{sv?'Storlek':'Size'}</span><input name="size_label" placeholder="152 / M / 38"/></label>
      <label><span>{sv?'Skick':'Condition'} *</span><select name="condition" defaultValue="GOOD"><option value="NEW_WITH_TAGS">{sv?'Ny med etikett':'New with tags'}</option><option value="LIKE_NEW">{sv?'Som ny':'Like new'}</option><option value="GOOD">{sv?'Bra':'Good'}</option><option value="USED">{sv?'Använd':'Used'}</option><option value="WELL_USED">{sv?'Väl använd':'Well used'}</option></select></label>
      <details className="listingAdvanced full" open={Boolean(initialOrganizationId)}><summary>{sv?'Fler uppgifter (valfritt)':'More details (optional)'}</summary><div className="listingAdvancedGrid"><label className="full"><span>{sv?'Beskrivning':'Description'}</span><textarea name="description" rows={4} maxLength={2000} placeholder={sv?'Modell eller annan relevant information':'Model or other relevant information'}/></label>      <label><span>{sv?'Förening':'Club'}</span><select name="organization_id" defaultValue={initialOrganizationId}><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label><span>{sv?'Lag':'Team'}</span><select name="team_id" defaultValue=""><option value="">{sv?'Inget valt':'None selected'}</option>{refs.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label><span>{sv?'Sport':'Sport'}</span><select name="sport_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.sports.map(s=><option key={s.id} value={s.id}>{labelFromKey(s.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Kategori':'Category'}</span><select name="category_id" defaultValue=""><option value="">{sv?'Ingen vald':'None selected'}</option>{refs.categories.map(c=><option key={c.id} value={c.id}>{labelFromKey(c.nameKey)}</option>)}</select></label>
      <label><span>{sv?'Varumärke':'Brand'}</span><select name="brand_id" defaultValue=""><option value="">{sv?'Inget valt':'None selected'}</option>{refs.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div></details>
      <div className="full formActions"><button className="primary" type="submit">{sv?'Publicera annons':'Publish listing'}</button><Link className="secondary inlineAction" href={`/${locale}`}>{sv?'Avbryt':'Cancel'}</Link></div>
    </form>
  </main>;
}
