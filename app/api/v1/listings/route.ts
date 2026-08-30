import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

const conditions = new Set(['NEW_WITH_TAGS','LIKE_NEW','GOOD','USED','WELL_USED']);

function optionalUuid(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.preview) return NextResponse.redirect(new URL('/sv/login', request.url), 303);

  const form = await request.formData();
  const locale = String(form.get('locale') ?? 'sv') === 'en' ? 'en' : 'sv';
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const sizeLabel = String(form.get('size_label') ?? '').trim();
  const condition = String(form.get('condition') ?? 'GOOD');
  const price = Number(String(form.get('price') ?? '').replace(',', '.'));
  const currency = String(form.get('currency') ?? 'SEK').toUpperCase();

  if (title.length < 3 || title.length > 120 || !conditions.has(condition) || !Number.isFinite(price) || price < 0) {
    return NextResponse.redirect(new URL(`/${locale}/sell?error=validation`, request.url), 303);
  }

  const priceMinor = Math.round(price * 100);
  const supabase = await createSupabaseServerClient();
  const payload = {
    seller_user_id: session.user.id,
    organization_id: optionalUuid(form.get('organization_id')),
    team_id: optionalUuid(form.get('team_id')),
    sport_id: optionalUuid(form.get('sport_id')),
    category_id: optionalUuid(form.get('category_id')),
    brand_id: optionalUuid(form.get('brand_id')),
    title,
    description: description || null,
    size_label: sizeLabel || null,
    condition,
    price_minor: priceMinor,
    currency,
    status: 'ACTIVE',
    published_at: new Date().toISOString()
  };

  const {error} = await supabase.from('listings').insert(payload);
  if (error) {
    console.error('listing create failed', error.message);
    return NextResponse.redirect(new URL(`/${locale}/sell?error=save`, request.url), 303);
  }
  return NextResponse.redirect(new URL(`/${locale}/profile?created=1`, request.url), 303);
}
