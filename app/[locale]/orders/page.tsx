import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrdersForUser} from '@/src/modules/orders/infrastructure/supabase-orders';
import {platformConfig} from '@/src/shared/config/platform';

const status=(s:string,sv:boolean)=>({
  PENDING:sv?'Reserverad – nästa steg väntar':'Reserved – next step pending',
  PAYMENT_PENDING:sv?'Väntar på betalning':'Awaiting payment',
  PAID:sv?'Betald':'Paid',
  FULFILLMENT_PENDING:sv?'Överlämning pågår':'Handoff in progress',
  COMPLETED:sv?'Affär klar':'Completed',
  CANCELLED:sv?'Avbruten':'Cancelled',
  REFUNDED:sv?'Återbetald':'Refunded',
  DISPUTED:sv?'Behöver lösas':'Needs attention'
}[s]??(sv?'Pågående':'In progress'));

const doneStatuses=new Set(['COMPLETED','CANCELLED','REFUNDED']);
type View='buying'|'selling'|'done';

export default async function OrdersPage({params,searchParams}:{params:Promise<{locale:string}>,searchParams:Promise<Record<string,string|undefined>>}){
  const {locale}=await params;
  const qs=await searchParams;
  if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound();
  const sv=locale==='sv';
  const session=await getCurrentSession();
  if(!session||session.preview)return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att se dina affärer':'Sign in to see your deals'}</h1><p>{sv?'Här följer du det du köper och säljer.':'Track what you buy and sell here.'}</p><Link className="primary inlineAction" href={`/${locale}/login?next=/${locale}/orders`}>{sv?'Logga in':'Sign in'}</Link></section></main>;

  const orders=await getOrdersForUser(session.user.id);
  const buying=orders.filter(o=>o.buyerUserId===session.user.id&&!doneStatuses.has(o.status));
  const selling=orders.filter(o=>o.sellerUserId===session.user.id&&!doneStatuses.has(o.status));
  const done=orders.filter(o=>doneStatuses.has(o.status));
  const requested=qs.view;
  const view:View=requested==='selling'||requested==='done'?'selling'===requested?'selling':'done':'buying';
  const current=view==='buying'?buying:view==='selling'?selling:done;

  const empty={
    buying:{title:sv?'Du köper inget just nu':'Nothing you are buying right now',body:sv?'När du reserverar något från marknaden dyker affären upp här.':'When you reserve something from the marketplace, the deal appears here.',label:sv?'Hitta något på marknaden':'Browse marketplace',href:`/${locale}`},
    selling:{title:sv?'Du säljer inget just nu':'Nothing you are selling right now',body:sv?'När någon reserverar en av dina annonser följer du affären här.':'When someone reserves one of your listings, you track the deal here.',label:sv?'Lägg upp något att sälja':'Sell something',href:`/${locale}/sell`},
    done:{title:sv?'Inga avslutade affärer ännu':'No finished deals yet',body:sv?'Klara och avbrutna affärer samlas här så att pågående saker inte blandas ihop med historiken.':'Finished and cancelled deals are kept here so they do not clutter active deals.',label:sv?'Till marknaden':'Go to marketplace',href:`/${locale}`}
  }[view];

  return <main className="accountShell dealsShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link><Link href={`/${locale}/messages`}>{sv?'Meddelanden':'Messages'} →</Link></div>
    {qs.error==='missing'&&<div className="authNotice" role="status">{sv?'Affären kunde inte hittas. Den kan ha avslutats eller tagits bort.':'The deal could not be found. It may have ended or been removed.'}</div>}
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'MINA AFFÄRER':'MY DEALS'}</span><h1>{sv?'Allt du köper och säljer':'Everything you buy and sell'}</h1><p>{sv?'Se direkt vad som behöver göras nu. Klara affärer sparas separat.':'See what needs attention now. Finished deals are kept separately.'}</p></div></section>
    <nav className="dealTabs" aria-label={sv?'Filtrera affärer':'Filter deals'}>
      <Link className={view==='buying'?'active':''} href={`/${locale}/orders?view=buying`}><span>{sv?'Jag köper':'Buying'}</span><b>{buying.length}</b></Link>
      <Link className={view==='selling'?'active':''} href={`/${locale}/orders?view=selling`}><span>{sv?'Jag säljer':'Selling'}</span><b>{selling.length}</b></Link>
      <Link className={view==='done'?'active':''} href={`/${locale}/orders?view=done`}><span>{sv?'Klart':'Done'}</span><b>{done.length}</b></Link>
    </nav>
    {current.length===0?<section className="emptyState dealEmpty"><strong>{empty.title}</strong><p>{empty.body}</p><Link className="primary inlineAction" href={empty.href}>{empty.label}</Link></section>:<section className="orderList">{current.map(o=>{const mine=o.buyerUserId===session.user.id;const money=new Intl.NumberFormat(sv?'sv-SE':'en-GB',{style:'currency',currency:o.currency,maximumFractionDigits:0}).format(o.totalMinor/100);return <Link className="orderCard" href={`/${locale}/orders/${o.id}`} key={o.id} prefetch={false}>{o.imageUrl?<div className="orderCardImage"><Image src={o.imageUrl} alt="" fill sizes="(max-width: 700px) 72px, 92px"/></div>:<div className="orderImageFallback">RE</div>}<div className="orderCardMain"><span className="eyebrow">{mine?(sv?'DU KÖPER':'YOU BUY'):(sv?'DU SÄLJER':'YOU SELL')}</span><h2>{o.title}</h2><p><span className={`orderStatusDot statusDot-${o.status.toLowerCase()}`}/>{status(o.status,sv)}</p></div><div className="orderCardEnd"><strong>{money}</strong><span aria-hidden="true">›</span></div></Link>})}</section>}
  </main>;
}
