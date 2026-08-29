import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import sv from '@/messages/sv.json';
import en from '@/messages/en.json';

const dictionaries = {sv, en} as const;

export default async function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!(locale in dictionaries)) notFound();
  const t = dictionaries[locale as keyof typeof dictionaries];

  const products = [
    {name: 'Nike Mercurial', meta: 'Fotbollsskor · Strl 36', price: '150 kr', emoji: '⚽'},
    {name: 'Adidas träningsjacka', meta: 'Jacka · Strl 152', price: '120 kr', emoji: '👕'},
    {name: 'Innebandyklubba', meta: 'Klubba · 87 cm', price: '200 kr', emoji: '🏑'},
    {name: 'Skridskor', meta: 'Skridskor · Strl 37', price: '180 kr', emoji: '⛸️'}
  ];

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <Image src="/brand/repassing-logo.png" width={156} height={88} alt="Repassing" priority />
        </div>
        <div className="headerActions">
          <Link className="lang" href={locale === 'sv' ? '/en' : '/sv'}>{locale === 'sv' ? 'EN' : 'SV'}</Link>
          <button className="iconButton" aria-label={t.favorites}>♡</button>
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">{t.club}</span>
        <h1>{t.headline}</h1>
        <p>{t.subheadline}</p>
        <button className="primary">{t.sell}</button>
      </section>

      <section className="content">
        <label className="search">
          <span>⌕</span>
          <input aria-label={t.search} placeholder={t.search} />
        </label>

        <div className="sectionHead">
          <div><span className="eyebrow">{t.inClub}</span><h2>{t.latest}</h2></div>
          <button className="textButton">{t.seeAll}</button>
        </div>

        <div className="grid">
          {products.map((p) => (
            <article className="card" key={p.name}>
              <div className="productImage" aria-hidden="true">{p.emoji}</div>
              <button className="heart" aria-label={t.favorite}>♡</button>
              <div className="cardBody">
                <h3>{p.name}</h3><p>{p.meta}</p><strong>{p.price}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav className="bottomNav" aria-label="Huvudnavigation">
        <button className="active">⌂<span>{t.home}</span></button>
        <button>⌕<span>{t.searchNav}</span></button>
        <button className="sellFab">＋<span>{t.sellNav}</span></button>
        <button>✉<span>{t.messages}</span></button>
        <button>○<span>{t.profile}</span></button>
      </nav>
    </main>
  );
}