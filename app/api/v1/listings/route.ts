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
  const images = form.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);
  const allowedImageTypes = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
  const currency = String(form.get('currency') ?? 'SEK').toUpperCase();

  if (title.length < 3 || title.length > 120 || !conditions.has(condition) || !Number.isFinite(price) || price < 0 || images.length < 1 || images.length > 6 || images.some(file => file.size > 10 * 1024 * 1024 || !allowedImageTypes.has(file.type))) {
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

  const {data: listing, error} = await supabase.from('listings').insert(payload).select('id').single();
  if (error || !listing) {
    console.error('listing create failed', error?.message);
    return NextResponse.redirect(new URL(`/${locale}/sell?error=save`, request.url), 303);
  }
  const {data: authData} = await supabase.auth.getUser();
  const authUserId = authData.user?.id;
  if (!authUserId) {
    await supabase.from('listings').delete().eq('id', listing.id);
    return NextResponse.redirect(new URL(`/${locale}/sell?error=auth`, request.url), 303);
  }

  const imageRows: {listing_id:string;storage_bucket:string;storage_path:string;sort_order:number}[] = [];
  const uploadedPaths: string[] = [];
  for (const [index, file] of images.entries()) {
    const extension = (file.name.split('.').pop() || file.type.split('/').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path = `${authUserId}/${listing.id}/${crypto.randomUUID()}.${extension}`;
    const {error: uploadError} = await supabase.storage.from('listing-images').upload(path, file, {contentType:file.type, upsert:false});
    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from('listing-images').remove(uploadedPaths);
      await supabase.from('listings').delete().eq('id', listing.id);
      console.error('listing image upload failed', uploadError.message);
      return NextResponse.redirect(new URL(`/${locale}/sell?error=image`, request.url), 303);
    }
    uploadedPaths.push(path);
    imageRows.push({listing_id:listing.id,storage_bucket:'listing-images',storage_path:path,sort_order:index});
  }
  const {error:imageRowError} = await supabase.from('listing_images').insert(imageRows);
  if (imageRowError) {
    await supabase.storage.from('listing-images').remove(uploadedPaths);
    await supabase.from('listings').delete().eq('id', listing.id);
    console.error('listing image metadata failed', imageRowError.message);
    return NextResponse.redirect(new URL(`/${locale}/sell?error=image`, request.url), 303);
  }
  return NextResponse.redirect(new URL(`/${locale}/profile?created=1`, request.url), 303);
}
