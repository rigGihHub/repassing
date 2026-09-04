import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getOrderForUser,getOrderHistory} from '@/src/modules/orders/infrastructure/supabase-orders';
import {getConversationPreviewForUser} from '@/src/modules/messaging/infrastructure/supabase-messaging';
import {platformConfig} from '@/src/shared/config/platform';
import {runtimeConfig} from '@/src/shared/config/runtime';

function money(locale:string,currency:string,value:number){return new Intl.NumberFormat(locale==='sv'?'sv-SE':'en-GB',{style:'currency',currency,maximumFractionDigits:0}).format(value/100);}
function when(locale:string,value:string|null){if(!value)return '—';return new Intl.DateTimeFormat(locale==='sv'?'sv-SE':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
const statusText=(status:string,sv:boolean)=>({PENDING:sv?'Reserverad':'Reserved',PAYMENT_PENDING:sv?'Väntar på betalning':'Awaiting payment',PAID:sv?'Betald':'Paid',FULFILLMENT_PENDING:sv?'Överlämning':'Handoff',COMPLETED:sv?'Affär klar':'Completed',CANCELLED:sv?'Avbruten':'Cancelled',REFUNDED:sv?'Återbetald':'Refunded',DISPUTED:sv?'Behöver lösas':'Needs attention'}[status]??status);

export default async function OrderPage({params,searchParams}:{params:Promise<{locale:string;id:string}>,searchParams:Promise<Record<string,string|undefined>>}){
  const {locale,id}=await params; const qs=await searchParams; if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound(); const sv=locale==='sv';
  const session=await getCurrentSession(); if(!session||session.preview)notFound(); const order=await getOrderForUser(id,session.user.id); if(!order)notFound();
  const [history,conversationPreview]=await Promise.all([getOrderHistory(id),order.conversationId?getConversationPreviewForUser(order.conversationId,session.user.id,3):Promise.resolve(null)]);
  const buyer=order.buyerUserId===session.user.id; const seller=!buyer; const total=money(locale,order.currency,order.totalMinor); const subtotal=money(locale,order.currency,order.subtotalMinor); const fee=money(locale,order.currency,order.platformFeeMinor); const sellerNet=money(locale,order.currency,order.sellerNetMinor);
  const livePayments=runtimeConfig.payments.mode==='stripe';
  const cancelError=qs.error?({handoff_started:sv?'Överlämningen har redan bekräftats av någon av er. Affären kan därför inte avbrytas automatiskt.':'Handoff has already been confirmed by one of you, so the deal cannot be cancelled automatically.',state_changed:sv?'Affären har ändrats sedan sidan laddades och kan inte längre avbrytas här. Ladda om sidan för aktuell status.':'The deal changed since the page loaded and can no longer be cancelled here. Reload for the current status.',forbidden:sv?'Du har inte behörighet att avbryta den här affären. Logga in på rätt konto.':'You do not have permission to cancel this deal. Sign in with the correct account.',missing:sv?'Affären finns inte längre.':'The deal no longer exists.',temporary:sv?'Affären kunde inte avbrytas på grund av ett tillfälligt fel. Inget har ändrats — försök igen.':'The deal could not be cancelled due to a temporary error. Nothing changed — please try again.'} as Record<string,string>)[qs.error]??null:null;
  const handoffError=qs.handoff?({activation_error:sv?'Reservationen skapades, men överlämningen kunde inte startas automatiskt. Avbryt affären och försök igen.':'The reservation was created, but handoff could not start automatically. Cancel the deal and try again.',invalid_time:sv?'Tiden kunde inte tolkas. Välj datum och tid igen.':'The time could not be understood. Choose the date and time again.',forbidden:sv?'Den åtgärden måste göras av rätt person i affären. Kontrollera att du är inloggad på rätt konto.':'That action must be done by the correct person in the deal. Check that you are signed in with the right account.',state_changed:sv?'Affären har ändrats sedan sidan laddades. Ladda om sidan innan du fortsätter.':'The deal changed since the page loaded. Reload the page before continuing.',missing:sv?'Affären finns inte längre.':'The deal no longer exists.',invalid:sv?'Den åtgärden är inte tillgänglig för den här affären.':'That action is not available for this deal.',temporary:sv?'Överlämningen kunde inte uppdateras på grund av ett tillfälligt fel. Försök igen.':'Handoff could not be updated due to a temporary error. Please try again.'} as Record<string,string>)[qs.handoff]??null:null;
  const checkoutPossible=livePayments&&buyer&&['PENDING','PAYMENT_PENDING'].includes(order.status);
  const localHandoff=['PAID','FULFILLMENT_PENDING'].includes(order.status)&&order.fulfillmentMethod==='LOCAL_HANDOFF';
  const handoffPlanned=Boolean(order.scheduledAt||order.handoffLocation);
  const canSellerConfirm=seller&&order.status==='FULFILLMENT_PENDING'&&!order.sellerConfirmedAt;
  const canBuyerConfirm=buyer&&order.status==='FULFILLMENT_PENDING'&&!order.buyerConfirmedAt;
  const canCancel=['PENDING','PAYMENT_PENDING','FULFILLMENT_PENDING'].includes(order.status)&&!order.sellerConfirmedAt&&!order.buyerConfirmedAt;
  const needsPlanning=localHandoff&&!handoffPlanned;
  const needsConfirmation=handoffPlanned&&(canSellerConfirm||canBuyerConfirm);
  const waitingForOther=order.status==='FULFILLMENT_PENDING'&&!needsPlanning&&!needsConfirmation;

  const nextStep = order.status==='COMPLETED'
    ? (sv?'Klart — affären är avslutad.':'Done — the deal is complete.')
    : checkoutPossible
      ? (sv?'Slutför betalningen för att gå vidare.':'Complete payment to continue.')
      : needsPlanning
        ? (sv?'Bestäm en enkel tid och plats för överlämningen.':'Choose a simple time and place for handoff.')
        : needsConfirmation
          ? (seller?(sv?'Bekräfta när du har lämnat över varan.':'Confirm when you have handed over the item.'):(sv?'Bekräfta när du har fått varan.':'Confirm when you have received the item.'))
          : waitingForOther
            ? (sv?'Du är klar för stunden. Vi väntar på den andra personen.':'You are done for now. We are waiting for the other person.')
            : null;

  return <main className="accountShell orderDetailShell"><div className="accountTop"><Link href={`/${locale}/orders`}>← {sv?'Mina affärer':'My orders'}</Link><span className={`statusPill status-${order.status.toLowerCase()}`}>{statusText(order.status,sv)}</span></div>
    {qs.reserved&&<div className="authNotice success">{livePayments?(sv?'Varan är reserverad. Slutför betalningen för att säkra köpet.':'The item is reserved. Complete payment to secure the purchase.'):(sv?'Varan är reserverad. Nästa steg är att bestämma överlämningen.':'The item is reserved. Next, arrange the handoff.')}</div>}
    {qs.cancelled&&<div className="authNotice">{sv?'Affären har avbrutits och annonsen är aktiv igen.':'The order was cancelled and the listing is active again.'}</div>}
    {cancelError&&<div className="formError" role="alert">{cancelError}</div>}
    {handoffError&&<div className="formError" role="alert">{handoffError}</div>}
    {qs.payment==='success'&&<div className="authNotice success">{sv?'Betalningen är skickad. Status uppdateras automatiskt när Stripe bekräftar den.':'Payment submitted. Status updates automatically after Stripe confirms it.'}</div>}
    {qs.payment==='cancelled'&&<div className="authNotice">{sv?'Du avbröt betalningen. Reservationen ligger kvar tills den avbryts eller betalningen slutförs.':'You cancelled checkout. The reservation remains until cancelled or paid.'}</div>}
    {qs.payment==='setup'&&<div className="authNotice">{sv?'Livebetalning är ännu inte aktiverad i Repassing-miljön.':'Live payments are not enabled in this Repassing environment yet.'}</div>}
    {qs.payment==='seller_setup'&&<div className="authNotice">{sv?'Säljaren måste slutföra sitt utbetalningskonto innan betalning kan tas emot.':'The seller must complete payout setup before payment can be accepted.'}</div>}
    {qs.payment==='error'&&<div className="formError">{sv?'Checkout kunde inte startas. Försök igen senare.':'Checkout could not be started. Try again later.'}</div>}
    {qs.handoff==='updated'&&<div className="authNotice success">{sv?'Överlämningen har uppdaterats.':'Handoff updated.'}</div>}
    {qs.handoff==='completed'&&<div className="authNotice success">{sv?'Affären är klar.':'The deal is complete.'}</div>}
    {qs.message==='sent'&&<div className="authNotice success">{sv?'Meddelandet är skickat.':'Message sent.'}</div>}
    {qs.message==='error'&&<div className="formError" role="alert">{sv?'Meddelandet kunde inte skickas. Försök igen.':'Message could not be sent. Please try again.'}</div>}

    <section className="orderDetailCard">{order.imageUrl?<div className="orderDetailImageWrap"><Image className="orderDetailImage" src={order.imageUrl} alt="" fill sizes="(max-width: 700px) 100vw, 300px" priority/></div>:<div className="orderDetailImage orderImageFallback">RE</div>}<div className="orderDetailMain"><span className="eyebrow">{buyer?(sv?'DU KÖPER':'YOU BUY'):(sv?'DU SÄLJER':'YOU SELL')}</span><h1>{order.title}</h1><strong className="detailPrice">{total}</strong>

      {nextStep&&<section className={`dealNextAction ${waitingForOther?'isWaiting':''}`}><span className="eyebrow">{sv?'NÄSTA STEG':'NEXT STEP'}</span><h2>{nextStep}</h2>
        {checkoutPossible&&<form method="post" action={`/api/v1/orders/${order.id}/checkout`}><input type="hidden" name="locale" value={locale}/><button className="primary dealPrimaryButton" type="submit">{order.status==='PAYMENT_PENDING'?(sv?'Fortsätt till betalning':'Continue to payment'):(sv?'Betala säkert':'Pay securely')}</button></form>}
        {needsPlanning&&<form method="post" action={`/api/v1/orders/${order.id}/handoff`} className="dealPlanningForm"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="action" value="SCHEDULE"/><label>{sv?'Plats':'Location'}<input name="handoff_location" list={`handoff-places-${order.id}`} defaultValue={order.handoffLocation??''} placeholder={sv?'t.ex. efter träningen':'e.g. after practice'}/><datalist id={`handoff-places-${order.id}`}><option value={sv?'Efter träningen':'After practice'}/><option value={sv?'Vid klubbhuset':'At the clubhouse'}/><option value={sv?'Vid nästa match':'At the next match'}/><option value={sv?'Vid idrottsplatsen':'At the sports ground'}/></datalist></label><label>{sv?'Tid':'Time'}<input name="scheduled_at" type="datetime-local" defaultValue={order.scheduledAt?new Date(order.scheduledAt).toISOString().slice(0,16):''}/></label><button className="primary dealPrimaryButton" type="submit">{sv?'Spara överlämning':'Save handoff'}</button><small>{sv?'Välj gärna en plats ni ändå brukar vara på.':'Pick a place you are both likely to visit anyway.'}</small></form>}
        {needsConfirmation&&<form method="post" action={`/api/v1/orders/${order.id}/handoff`}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="action" value={seller?'SELLER_CONFIRM':'BUYER_CONFIRM'}/><button className="primary dealPrimaryButton" type="submit">{seller?(sv?'Jag har lämnat över varan':'I handed over the item'):(sv?'Jag har fått varan':'I received the item')}</button></form>}
        {waitingForOther&&<p className="dealWaitingNote">{sv?'Du behöver inte göra något mer just nu.':'You do not need to do anything else right now.'}</p>}
      </section>}

      {handoffPlanned&&localHandoff&&<section className="handoffSummaryCard"><div><strong>{sv?'Överlämning':'Handoff'}</strong><span>{when(locale,order.scheduledAt)}{order.handoffLocation?` · ${order.handoffLocation}`:''}</span></div>{order.status==='FULFILLMENT_PENDING'&&<div className="confirmationMini"><span className={order.sellerConfirmedAt?'done':''}>{order.sellerConfirmedAt?'✓ ':''}{sv?'Säljare':'Seller'}</span><span className={order.buyerConfirmedAt?'done':''}>{order.buyerConfirmedAt?'✓ ':''}{sv?'Köpare':'Buyer'}</span></div>}</section>}

      {handoffPlanned&&localHandoff&&order.status!=='COMPLETED'&&<details className="secondaryDisclosure"><summary>{sv?'Ändra tid eller plats':'Change time or place'}</summary><form method="post" action={`/api/v1/orders/${order.id}/handoff`} className="handoffForm compact"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="action" value="SCHEDULE"/><label>{sv?'Plats':'Location'}<input name="handoff_location" defaultValue={order.handoffLocation??''}/></label><label>{sv?'Tid':'Time'}<input name="scheduled_at" type="datetime-local" defaultValue={order.scheduledAt?new Date(order.scheduledAt).toISOString().slice(0,16):''}/></label><button className="secondary" type="submit">{sv?'Uppdatera':'Update'}</button></form></details>}

      {order.status==='COMPLETED'&&<section className="completedPanel"><strong>✓ {sv?'Affären är klar':'Order completed'}</strong><p>{sv?'Varan har fått en ny användare.':'The item has a new user.'}</p><Link className="secondary inlineAction receiptLink" href={`/${locale}/orders/${order.id}/receipt`}>{sv?'Visa affärskvitto':'View transaction receipt'}</Link></section>}

      {order.conversationId&&<section className="dealConversation"><div className="dealConversationHead"><div><span className="eyebrow">{sv?'KONTAKT I AFFÄREN':'DEAL CHAT'}</span><h2>{sv?'Prata om överlämningen här':'Coordinate the handoff here'}</h2></div><Link className="textLink" href={`/${locale}/messages/${order.conversationId}`}>{sv?'Visa hela chatten':'Open full chat'} →</Link></div>
        <div className="dealMessagePreview">{conversationPreview?.messages.length?conversationPreview.messages.map(message=>{const mine=message.senderUserId===session.user.id;return <div className={`dealMessageBubble ${mine?'mine':'theirs'}`} key={message.id}><p>{message.body}</p><time>{new Intl.DateTimeFormat(sv?'sv-SE':'en-GB',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date(message.createdAt))}</time></div>}):<p className="dealConversationEmpty">{sv?'Inga meddelanden ännu. Skriv t.ex. när och var ni kan ses.':'No messages yet. For example, suggest when and where you can meet.'}</p>}</div>
        {order.status!=='CANCELLED'&&<form className="dealMessageComposer" action={`/api/v1/conversations/${order.conversationId}/messages`} method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="return_to" value={`/${locale}/orders/${order.id}`}/><textarea name="body" rows={2} maxLength={5000} required placeholder={sv?'T.ex. Kan vi ses efter träningen på torsdag?':'E.g. Can we meet after practice on Thursday?'}/><button className="secondary" type="submit">{sv?'Skicka meddelande':'Send message'}</button></form>}
      </section>}

      <div className="orderActions"><Link className="secondary inlineAction" href={`/${locale}/listings/${order.listingId}`}>{sv?'Visa annons':'View listing'}</Link></div>

      <details className="dealDetails"><summary>{sv?'Affärsdetaljer':'Deal details'}</summary><dl className="detailFacts"><div><dt>{sv?'Annonspris':'Listing price'}</dt><dd>{subtotal}</dd></div>{order.platformFeeMinor>0&&<div><dt>{sv?'Repassing-avgift':'Repassing fee'}</dt><dd>{fee}</dd></div>} {!buyer&&<div><dt>{sv?'Till säljaren':'Seller proceeds'}</dt><dd>{sellerNet}</dd></div>}<div><dt>Status</dt><dd>{statusText(order.status,sv)}</dd></div><div><dt>{sv?'Överlämning':'Fulfillment'}</dt><dd>{order.fulfillmentMethod==='LOCAL_HANDOFF'?(sv?'Lokal överlämning':'Local handoff'):(order.fulfillmentMethod??'—')}</dd></div></dl>
        {history.length>0&&<div className="dealHistory"><strong>{sv?'Vad som hänt':'What happened'}</strong>{history.map(item=><div className="timelineItem" key={item.id}><span className="timelineDot"/><div><span>{statusText(item.toStatus,sv)}</span><small>{when(locale,item.createdAt)}</small></div></div>)}</div>}
      </details>

      {canCancel&&<details className="dangerDisclosure"><summary>{sv?'Avbryt affären':'Cancel deal'}</summary><form className="dangerZone" method="post" action={`/api/v1/orders/${order.id}/cancel`}><input type="hidden" name="locale" value={locale}/><button className="dangerButton" type="submit">{order.status==='FULFILLMENT_PENDING'?(sv?'Avbryt affär':'Cancel deal'):(sv?'Avbryt reservation':'Cancel reservation')}</button><small>{sv?'Annonsen blir tillgänglig på marknaden igen.':'The listing becomes available on the marketplace again.'}</small></form></details>}
    </div></section>
  </main>;
}
