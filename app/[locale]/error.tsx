'use client';

import Link from 'next/link';

export default function LocaleError({reset}:{error:Error & {digest?:string};reset:()=>void}){
  return <main className="accountShell">
    <section className="simpleHero">
      <span className="eyebrow">REPASSING</span>
      <h1>Något gick fel</h1>
      <p>Sidan kunde inte laddas korrekt. Försök igen. Om en extern tjänst tillfälligt ligger nere ska startsidan fortfarande kunna öppnas.</p>
      <div className="heroActions">
        <button className="primary inlineAction" type="button" onClick={()=>reset()}>Försök igen</button>
        <Link className="secondary inlineAction" href="/sv">Till startsidan</Link>
      </div>
    </section>
  </main>;
}
