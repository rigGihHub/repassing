import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('unpaid local handoff migration is service-role only and moves reservations forward', async () => {
  const sql = await read('supabase/migrations/20260903111500_activate_unpaid_local_handoff.sql');

  assert.match(sql, /create or replace function public\.activate_unpaid_local_handoff/i);
  assert.match(sql, /v_order\.status not in \('PENDING','PAYMENT_PENDING'\)/i);
  assert.match(sql, /set status = 'FULFILLMENT_PENDING'/i);
  assert.match(sql, /LOCAL_HANDOFF_NO_PAYMENT/i);
  assert.match(sql, /revoke all on function public\.activate_unpaid_local_handoff\(uuid,uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.activate_unpaid_local_handoff\(uuid,uuid\) to service_role/i);
});

test('reservation route activates local handoff only when live payments are disabled', async () => {
  const route = await read('app/api/v1/reservations/route.ts');

  assert.match(route, /runtimeConfig\.payments\.mode\s*!==\s*'stripe'/);
  assert.match(route, /admin\.rpc\('activate_unpaid_local_handoff'/);
  assert.match(route, /p_actor_user_id:session\.user\.id/);
});

test('order page exposes handoff for paid or fulfillment-pending orders', async () => {
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(page, /\['PAID','FULFILLMENT_PENDING'\]\.includes\(order\.status\)/);
  assert.match(page, /order\.status==='FULFILLMENT_PENDING'/);
  assert.match(page, /livePayments&&buyer&&\['PENDING','PAYMENT_PENDING'\]\.includes\(order\.status\)/);
  assert.match(page, /Bestäm en enkel tid och plats för överlämningen/);
});

test('payout entry point stays hidden unless Stripe mode is active', async () => {
  const profile = await read('app/[locale]/profile/page.tsx');
  assert.match(profile, /runtimeConfig\.payments\.mode==='stripe'&&<Link[^>]+href={`\/\$\{locale\}\/payouts`}/);
});

test('CI runs the core regression guard before typecheck and build', async () => {
  const ci = await read('.github/workflows/ci.yml');
  const coreIndex = ci.indexOf('npm run test:core');
  const typeIndex = ci.indexOf('npm run typecheck');
  const buildIndex = ci.indexOf('npm run build');

  assert.ok(coreIndex >= 0, 'test:core must be part of CI');
  assert.ok(typeIndex > coreIndex, 'typecheck must run after core regression tests');
  assert.ok(buildIndex > typeIndex, 'build must run after typecheck');
});


test('sell flow creates a draft before image upload and only activates after metadata succeeds', async () => {
  const route = await read('app/api/v1/listings/route.ts');
  const draftIndex = route.indexOf("status: 'DRAFT'");
  const uploadIndex = route.indexOf("storage.from('listing-images').upload");
  const metadataIndex = route.indexOf("from('listing_images').insert(imageRows)");
  const activeIndex = route.indexOf("update({status:'ACTIVE'");

  assert.ok(draftIndex >= 0, 'listing must start as DRAFT');
  assert.ok(uploadIndex > draftIndex, 'images must upload after draft creation');
  assert.ok(metadataIndex > uploadIndex, 'image metadata must follow uploads');
  assert.ok(activeIndex > metadataIndex, 'listing must only become ACTIVE after image metadata succeeds');
  assert.match(route, /status:\s*'DRAFT'[\s\S]{0,120}published_at:\s*null/);
});

test('sell rollback deletes only a draft and removes uploaded storage objects', async () => {
  const route = await read('app/api/v1/listings/route.ts');
  assert.match(route, /storage\.from\('listing-images'\)\.remove\(uploadedPaths\)/);
  assert.match(route, /from\('listings'\)\.delete\(\)\.eq\('id', listing\.id\)\.eq\('status','DRAFT'\)/);
});

test('sell draft is preserved on failed submit and cleared only after successful publish', async () => {
  const persistence = await read('app/[locale]/sell/sell-draft-persistence.tsx');
  const detail = await read('app/[locale]/listings/[id]/page.tsx');
  const clear = await read('app/[locale]/listings/[id]/sell-draft-clear.tsx');

  assert.doesNotMatch(persistence, /removeItem\(storageKey\)[\s\S]{0,160}addEventListener\('submit',clear\)/);
  assert.match(persistence, /addEventListener\('submit',saveBeforeSubmit\)/);
  assert.match(detail, /query\.created==='1'&&isOwner&&<SellDraftClear locale={locale}\/>/);
  assert.match(clear, /removeItem\(`repassing:sell-draft:\$\{locale\}`\)/);
});

test('sell form prevents accidental duplicate submits while upload is in progress', async () => {
  const guard = await read('app/[locale]/sell/sell-submit-guard.tsx');
  const page = await read('app/[locale]/sell/page.tsx');
  assert.match(guard, /if \(submitting\)/);
  assert.match(guard, /submitButton\.disabled = true/);
  assert.match(guard, /Publicerar…/);
  assert.match(page, /<SellSubmitGuard sv={sv}\/>/);
});

test('reservation retry migration returns the existing in-progress deal for the same buyer', async () => {
  const sql = await read('supabase/migrations/20260903170000_idempotent_listing_reservation.sql');

  assert.match(sql, /for update/i);
  assert.match(sql, /o\.listing_id\s*=\s*p_listing_id/i);
  assert.match(sql, /o\.buyer_user_id\s*=\s*v_user_id/i);
  assert.match(sql, /o\.status in \('PENDING','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','DISPUTED'\)/i);
  assert.match(sql, /if v_order_id is not null then/i);
  assert.match(sql, /return query select v_order_id, v_conversation_id/i);
});

test('reservation retry migration still rejects another buyer once the listing is no longer active', async () => {
  const sql = await read('supabase/migrations/20260903170000_idempotent_listing_reservation.sql');
  const existingDealCheck = sql.indexOf('if v_order_id is not null then');
  const availabilityCheck = sql.indexOf("if v_listing.status <> 'ACTIVE'");

  assert.ok(existingDealCheck >= 0, 'same-buyer retry check must exist');
  assert.ok(availabilityCheck > existingDealCheck, 'listing availability must be checked after same-buyer retry recovery');
  assert.match(sql, /raise exception 'listing is not available'/i);
});

test('buy CTA disables immediately to guard against accidental duplicate submits', async () => {
  const guard = await read('app/[locale]/listings/[id]/reservation-submit-guard.tsx');
  const page = await read('app/[locale]/listings/[id]/page.tsx');

  assert.match(guard, /if\(submitting\)/);
  assert.match(guard, /button\.disabled=true/);
  assert.match(guard, /Startar affären…/);
  assert.match(page, /<ReservationSubmitGuard sv=\{sv\}\/>/);
});


test('cancelling an unconfirmed local handoff safely reopens the listing', async () => {
  const sql = await read('supabase/migrations/20260903183000_cancel_reopens_listing.sql');

  assert.match(sql, /v_order\.status not in \('PENDING','PAYMENT_PENDING','FULFILLMENT_PENDING'\)/i);
  assert.match(sql, /seller_confirmed_at is not null or v_fulfillment\.buyer_confirmed_at is not null/i);
  assert.match(sql, /set status = 'CANCELLED', updated_at = now\(\)/i);
  assert.match(sql, /set status = 'ACTIVE', reserved_at = null/i);
  assert.match(sql, /other\.status in \('PENDING','PAYMENT_PENDING','PAID','FULFILLMENT_PENDING','DISPUTED'\)/i);
});

test('cancellation is idempotent and cannot reopen after a handoff confirmation', async () => {
  const sql = await read('supabase/migrations/20260903183000_cancel_reopens_listing.sql');

  assert.match(sql, /if v_order\.status = 'CANCELLED' then[\s\S]{0,80}return true/i);
  assert.match(sql, /handoff already confirmed by a participant/i);
});

test('order page allows cancellation during unconfirmed local handoff only', async () => {
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(page, /const canCancel=\['PENDING','PAYMENT_PENDING','FULFILLMENT_PENDING'\]\.includes\(order\.status\)&&!order\.sellerConfirmedAt&&!order\.buyerConfirmedAt/);
  assert.match(page, /Avbryt affär/);
  assert.match(page, /Annonsen blir tillgänglig på marknaden igen/);
});

test('reservation failures are translated into specific user-facing reasons', async () => {
  const route = await read('app/api/v1/reservations/route.ts');
  const page = await read('app/[locale]/listings/[id]/page.tsx');

  assert.match(route, /reservationErrorCode/);
  assert.match(route, /seller cannot reserve own listing/);
  assert.match(route, /listing is not available/);
  assert.match(route, /message too long/);
  assert.match(route, /\?error=\$\{code\}/);
  assert.match(page, /Någon annan hann före/);
  assert.match(page, /Din inloggning behöver förnyas/);
  assert.match(page, /Ett tillfälligt fel uppstod/);
});

test('handoff route rejects invalid dates before calling the database', async () => {
  const route = await read('app/api/v1/orders/[id]/handoff/route.ts');
  const parseIndex = route.indexOf('Number.isNaN(parsed.getTime())');
  const rpcIndex = route.indexOf("admin.rpc('advance_local_handoff'");

  assert.ok(parseIndex >= 0, 'invalid time must be checked');
  assert.ok(rpcIndex > parseIndex, 'date validation must happen before handoff RPC');
  assert.match(route, /handoff=invalid_time/);
});

test('handoff database failures become actionable UI states', async () => {
  const route = await read('app/api/v1/orders/[id]/handoff/route.ts');
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(route, /handoffErrorCode/);
  assert.match(route, /order is not ready/);
  assert.match(route, /order is not awaiting/);
  assert.match(route, /return 'state_changed'/);
  assert.match(page, /Affären har ändrats sedan sidan laddades/);
  assert.match(page, /Tiden kunde inte tolkas/);
});

test('cancellation failures explain confirmed handoff and stale state separately', async () => {
  const route = await read('app/api/v1/orders/[id]/cancel/route.ts');
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(route, /handoff already confirmed/);
  assert.match(route, /return 'handoff_started'/);
  assert.match(route, /order can no longer be cancelled/);
  assert.match(route, /return 'state_changed'/);
  assert.match(page, /Överlämningen har redan bekräftats/);
  assert.match(page, /kan inte längre avbrytas här/);
});

test('sell enhanced submit reports real browser upload progress before server processing', async () => {
  const guard = await read('app/[locale]/sell/sell-submit-guard.tsx');

  assert.match(guard, /new XMLHttpRequest\(\)/);
  assert.match(guard, /x-repassing-enhanced-submit/);
  assert.match(guard, /xhr\.upload\.onprogress/);
  assert.match(guard, /uploadEvent\.loaded \/ uploadEvent\.total/);
  assert.match(guard, /Bilderna är uppladdade\. Sparar och publicerar annonsen/);
});

test('sell enhanced submit keeps a non-JavaScript form fallback and receives structured API results', async () => {
  const route = await read('app/api/v1/listings/route.ts');
  const page = await read('app/[locale]/sell/page.tsx');

  assert.match(page, /action="\/api\/v1\/listings" method="post" encType="multipart\/form-data"/);
  assert.match(route, /request\.headers\.get\('x-repassing-enhanced-submit'\) === '1'/);
  assert.match(route, /NextResponse\.json\(\{ok:false, code, redirect:/);
  assert.match(route, /NextResponse\.json\(\{ok:true, redirect:successUrl\.toString\(\)\}\)/);
  assert.match(route, /NextResponse\.redirect\(successUrl, 303\)/);
});

test('sell publish guard protects users on offline or interrupted connections', async () => {
  const guard = await read('app/[locale]/sell/sell-submit-guard.tsx');

  assert.match(guard, /if \(!navigator\.onLine\)/);
  assert.match(guard, /window\.addEventListener\('beforeunload',onBeforeUnload\)/);
  assert.match(guard, /xhr\.onerror = \(\) => fail\('network'\)/);
  assert.match(guard, /Kontrollera om annonsen hann publiceras innan du försöker igen/);
});

test('sell client rejects oversized photo batches before sending them over a slow connection', async () => {
  const guard = await read('app/[locale]/sell/sell-submit-guard.tsx');

  assert.match(guard, /files\.length < 1 \|\| files\.length > 6/);
  assert.match(guard, /file\.size > 10 \* 1024 \* 1024/);
  assert.match(guard, /fail\('validation'\)/);
});

test('deal page exposes exactly one primary next-step area and keeps secondary actions secondary', async () => {
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(page, /className={`dealNextAction/);
  assert.match(page, /needsPlanning/);
  assert.match(page, /needsConfirmation/);
  assert.match(page, /waitingForOther/);
  assert.match(page, /dealConversation/);
  assert.match(page, /Visa hela chatten/);
  assert.match(page, /className="secondary" type="submit"/);
  assert.doesNotMatch(page, /dealConversation[\s\S]{0,2200}className="primary/);
});

test('technical deal facts and history are progressively disclosed instead of dominating the core flow', async () => {
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(page, /<details className="dealDetails">/);
  assert.match(page, /Affärsdetaljer/);
  assert.match(page, /dealHistory/);
  assert.match(page, /Ändra tid eller plats/);
  assert.match(page, /<details className="dangerDisclosure">/);
});

test('deal page keeps recent messages inside the deal without making chat the primary action', async () => {
  const page = await read('app/[locale]/orders/[id]/page.tsx');
  const messaging = await read('src/modules/messaging/infrastructure/supabase-messaging.ts');

  assert.match(page, /KONTAKT I AFFÄREN/);
  assert.match(page, /dealMessagePreview/);
  assert.match(page, /dealMessageComposer/);
  assert.match(page, /className="secondary" type="submit"/);
  assert.match(messaging, /getConversationPreviewForUser/);
  assert.match(messaging, /\.order\('created_at',\{ascending:false\}\)\.limit\(safeLimit\)/);
  assert.doesNotMatch(messaging, /getConversationPreviewForUser[\s\S]{0,1200}messages\(id,sender_user_id/);
});

test('inline deal messages return to the same order and reject unsafe return paths', async () => {
  const route = await read('app/api/v1/conversations/[id]/messages/route.ts');
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(page, /name="return_to" value={`\/\$\{locale\}\/orders\/\$\{order\.id\}`}/);
  assert.match(route, /safeReturnPath/);
  assert.match(route, /path\.startsWith\(`\/\$\{locale\}\//);
  assert.match(route, /path\.includes\('\:\/\/'\)/);
  assert.match(route, /url\.searchParams\.set\('message',result\)/);
});

test('message composer preserves server-side participant enforcement and bounded message length', async () => {
  const route = await read('app/api/v1/conversations/[id]/messages/route.ts');
  const page = await read('app/[locale]/orders/[id]/page.tsx');

  assert.match(route, /supabase\.rpc\('send_conversation_message'/);
  assert.match(route, /body\.length>5000/);
  assert.match(page, /maxLength=\{5000\}/);
  assert.match(page, /Meddelandet kunde inte skickas/);
});


test('empty marketplace asks for real supply instead of rendering fake inventory', async () => {
  const page = await read('app/[locale]/page.tsx');

  assert.match(page, /DIN MARKNAD BÖRJAR HÄR/);
  assert.match(page, /Bli först med att lägga upp något/);
  assert.match(page, /supplySteps/);
  assert.doesNotMatch(page, /liveMode&&!hasFilters&&!hasLiveListings[\s\S]{0,1800}mockListings\.map/);
});

test('low-supply live marketplace promotes one next listing without hiding real listings', async () => {
  const page = await read('app/[locale]/page.tsx');

  assert.match(page, /liveListings\.length > 0 && liveListings\.length <= 10/);
  assert.match(page, /lowSupply&&<section className="supplyActivation"/);
  assert.match(page, /<div className="grid" id="marketplace-grid">/);
});

test('marketplace sell calls to action preserve an active club context', async () => {
  const page = await read('app/[locale]/page.tsx');

  assert.match(page, /const sellHref = activeOrganization \? `\/\$\{locale\}\/sell\?organization=\$\{activeOrganization\.id\}`/);
  assert.match(page, /href=\{sellHref\}/);
});

test('successful listing offers a fast path to sell another item', async () => {
  const page = await read('app/[locale]/listings/[id]/page.tsx');
  assert.match(page, /Annonsen är ute – har du en pryl till/);
  assert.match(page, /Sälj en till/);
  assert.match(page, /sell\?again=\$\{listing\.id\}/);
  assert.match(page, /query\.created==='1'&&isOwner/);
});

test('repeat-listing flow reuses only shared club context from an owned listing', async () => {
  const page = await read('app/[locale]/sell/page.tsx');
  assert.match(page, /reuseSource\.sellerUserId === session\.user\.id/);
  assert.match(page, /reusableListing\?\.organizationId/);
  assert.match(page, /reusableListing\?\.teamId/);
  assert.match(page, /reusableListing\?\.sportId/);
  assert.doesNotMatch(page, /defaultValue=\{reusableListing\?\.title/);
  assert.doesNotMatch(page, /defaultValue=\{reusableListing\?\.price/);
});

test('repeat-listing login return keeps the repeat context', async () => {
  const page = await read('app/[locale]/sell/page.tsx');
  assert.match(page, /sellQuery\.set\('again', requestedAgain\)/);
  assert.match(page, /login\?next=\$\{encodeURIComponent\(sellPath\)\}/);
});

test('human marketplace search extracts an obvious size without discarding the useful words', async () => {
  const parser = await read('src/modules/marketplace/application/human-search.ts');
  const marketplace = await read('src/modules/marketplace/infrastructure/supabase-marketplace.ts');

  assert.match(parser, /numericSize/);
  assert.match(parser, /letterSize/);
  assert.match(parser, /searchQuery/);
  assert.match(marketplace, /parseHumanMarketplaceQuery\(filters\.query\)/);
  assert.match(marketplace, /filters\.sizeLabel\?\.trim\(\) \|\| humanQuery\.inferredSize/);
  assert.match(marketplace, /p_query: humanQuery\.searchQuery \|\| null/);
});

test('marketplace computes filter state before low-supply state', async () => {
  const page = await read('app/[locale]/page.tsx');
  assert.ok(page.indexOf('const hasFilters=') < page.indexOf('const lowSupply ='));
});
