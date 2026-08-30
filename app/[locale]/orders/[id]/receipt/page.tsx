import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrderForUser,getOrderHistory} from '@/src/modules/orders/infrastructure/supabase-orders';
import {platformConfig} from '@/src/shared/config/platform';
import PrintButton from './PrintButton';

function money(locale:string,currency:string,value:number){return new Intl.NumberFormat(locale==='sv'?'sv-SE':'en-GB',{style:'currency',currency,minimumFractionDigits:2}).format(value/100)}
function when(locale:string,value:string|null){if(!value)return '—';return new Intl.DateTimeFormat(locale==='sv'?'sv-SE':'en-GB',{dateStyle:'long',timeStyle:'short'}).format(new Date(value));}

export default async function ReceiptPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound();const sv=locale==='sv';
  const session=await getCurrentSession();if(!session||session.preview)notFound();const currentSession=session!;
  const order=await getOrderForUser(id,currentSession.user.id);if(!order)notFound();const currentOrder=order!;
  const history=await getOrderHistory(id);const completedEvent=[...history].reverse().find(h=>h.toStatus==='COMPLETED');const isCompleted=currentOrder.status==='COMPLETED';
  const buyer=currentOrder.buyerUserId===currentSession.user.id;
  return <main className="receiptShell"><div className="receiptToolbar"><Link href={`/${locale}/orders/${currentOrder.id}`}>← {sv?'Till affären':'Back to order'}</Link><PrintButton label={sv?'Skriv ut / spara PDF':'Print / save PDF'}/></div>
    <article className="receiptCard"><header className="receiptHeader"><div><span className="eyebrow">REPASSING</span><h1>{sv?'Affärskvitto':'Transaction receipt'}</h1><p>{sv?'Play more. Waste less.':'Play more. Waste less.'}</p></div><div className="receiptMeta"><span>{sv?'Order-ID':'Order ID'}</span><strong>{currentOrder.id}</strong></div></header>
      {!isCompleted&&<div className="authNotice">{sv?'Affären är ännu inte slutförd. Detta är därför en preliminär transaktionsöversikt.':'This order is not completed yet, so this is a preliminary transaction summary.'}</div>}
      <section className="receiptSection"><h2>{currentOrder.title}</h2><dl className="receiptFacts"><div><dt>{sv?'Roll':'Role'}</dt><dd>{buyer?(sv?'Köpare':'Buyer'):(sv?'Säljare':'Seller')}</dd></div><div><dt>{sv?'Skapad':'Created'}</dt><dd>{when(locale,currentOrder.createdAt)}</dd></div><div><dt>{sv?'Slutförd':'Completed'}</dt><dd>{when(locale,completedEvent?.createdAt??currentOrder.fulfillmentCompletedAt)}</dd></div><div><dt>{sv?'Överlämning':'Handoff'}</dt><dd>{currentOrder.handoffLocation??(sv?'Lokal överlämning':'Local handoff')}</dd></div></dl></section>
      <section className="receiptSection"><h2>{sv?'Belopp':'Amounts'}</h2><dl className="receiptTotals"><div><dt>{sv?'Annonspris':'Listing price'}</dt><dd>{money(locale,currentOrder.currency,currentOrder.subtotalMinor)}</dd></div>{currentOrder.platformFeeMinor>0&&<div><dt>{sv?'Repassing-avgift':'Repassing fee'}</dt><dd>{money(locale,currentOrder.currency,currentOrder.platformFeeMinor)}</dd></div>}<div className="receiptTotal"><dt>{sv?'Köparens total':'Buyer total'}</dt><dd>{money(locale,currentOrder.currency,currentOrder.totalMinor)}</dd></div><div><dt>{sv?'Säljarens netto':'Seller proceeds'}</dt><dd>{money(locale,currentOrder.currency,currentOrder.sellerNetMinor)}</dd></div></dl></section>
      <footer className="receiptFooter"><p>{sv?'Detta dokument är en transaktionsöversikt från Repassing och inte en moms- eller skattefaktura.':'This document is a transaction summary from Repassing, not a VAT or tax invoice.'}</p><small>{sv?'Genererat från orderhistoriken i Repassing.':'Generated from the order history in Repassing.'}</small></footer>
    </article>
  </main>;
}
