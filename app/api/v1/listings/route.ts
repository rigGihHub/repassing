import {NextResponse} from 'next/server';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

const conditions = new Set(['NEW_WITH_TAGS','LIKE_NEW','GOOD','USED','WELL_USED']);
const allowedImageTypes = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && uuidPattern.test(text) ? text : null;
}

export async function POST(request: Request) {
  const enhancedSubmit = request.headers.get('x-repassing-enhanced-submit') === '1';
  const form = await request.formData();
  const locale = String(form.get('locale') ?? 'sv') === 'en' ? 'en' : 'sv';
  const organizationContext = optionalUuid(form.get('organization_context'));
  const sellPath = `/${locale}/sell${organizationContext ? `?organization=${encodeURIComponent(organizationContext)}` : ''}`;
  const errorUrl = (code:string) => new URL(`${sellPath}${sellPath.includes('?') ? '&' : '?'}error=${code}`, request.url);
  const failure = (code:string, status=422) => enhancedSubmit
    ? NextResponse.json({ok:false, code, redirect:errorUrl(code).toString()}, {status})
    : NextResponse.redirect(errorUrl(code), 303);

  const session = await getCurrentSession();
  if (!session || session.preview) {
    const loginUrl = new URL(`/${locale}/login?next=${encodeURIComponent(sellPath)}`, request.url);
    return enhancedSubmit
      ? NextResponse.json({ok:false, code:'auth', redirect:loginUrl.toString()}, {status:401})
      : NextResponse.redirect(loginUrl, 303);
  }

  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const sizeLabel = String(form.get('size_label') ?? '').trim();
  const condition = String(form.get('condition') ?? 'GOOD');
  const price = Number(String(form.get('price') ?? '').replace(',', '.'));
  const images = form.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);

  if (title.length < 3 || title.length > 120 || description.length > 2000 || sizeLabel.length > 80 || !conditions.has(condition) || !Number.isFinite(price) || price < 0 || price > 1_000_000 || images.length < 1 || images.length > 6 || images.some(file => file.size > 10 * 1024 * 1024 || !allowedImageTypes.has(file.type))) {
    return failure('validation');
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
    currency: 'SEK',
    status: 'DRAFT',
    published_at: null
  };

  // Create the listing as a draft first. This keeps rollback compatible with
  // the existing delete-own-draft RLS policy if an image upload fails.
  const {data: listing, error} = await supabase.from('listings').insert(payload).select('id').single();
  if (error || !listing) {
    console.error('listing draft create failed', error?.message);
    return failure('save', 500);
  }

  const cleanupDraft = async (uploadedPaths:string[], removeImageRows=false) => {
    if (uploadedPaths.length) await supabase.storage.from('listing-images').remove(uploadedPaths);
    if (removeImageRows) await supabase.from('listing_images').delete().eq('listing_id', listing.id);
    await supabase.from('listings').delete().eq('id', listing.id).eq('status','DRAFT');
  };

  const {data: authData} = await supabase.auth.getUser();
  const authUserId = authData.user?.id;
  if (!authUserId) {
    await cleanupDraft([]);
    const loginUrl = new URL(`/${locale}/login?next=${encodeURIComponent(sellPath)}`, request.url);
    return enhancedSubmit
      ? NextResponse.json({ok:false, code:'auth', redirect:loginUrl.toString()}, {status:401})
      : NextResponse.redirect(loginUrl, 303);
  }

  const imageRows: {listing_id:string;storage_bucket:string;storage_path:string;sort_order:number}[] = [];
  const uploadedPaths: string[] = [];
  for (const [index, file] of images.entries()) {
    const extension = (file.name.split('.').pop() || file.type.split('/').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
    const path = `${authUserId}/${listing.id}/${crypto.randomUUID()}.${extension}`;
    const {error: uploadError} = await supabase.storage.from('listing-images').upload(path, file, {contentType:file.type, upsert:false});
    if (uploadError) {
      await cleanupDraft(uploadedPaths);
      console.error('listing image upload failed', uploadError.message);
      return failure('image', 502);
    }
    uploadedPaths.push(path);
    imageRows.push({listing_id:listing.id,storage_bucket:'listing-images',storage_path:path,sort_order:index});
  }

  const {error:imageRowError} = await supabase.from('listing_images').insert(imageRows);
  if (imageRowError) {
    await cleanupDraft(uploadedPaths);
    console.error('listing image metadata failed', imageRowError.message);
    return failure('image', 502);
  }

  const {error:publishError} = await supabase.from('listings').update({status:'ACTIVE',published_at:new Date().toISOString()}).eq('id',listing.id).eq('status','DRAFT');
  if (publishError) {
    await cleanupDraft(uploadedPaths, true);
    console.error('listing publish failed', publishError.message);
    return failure('save', 500);
  }

  const successUrl = new URL(`/${locale}/listings/${listing.id}?created=1`, request.url);
  return enhancedSubmit
    ? NextResponse.json({ok:true, redirect:successUrl.toString()})
    : NextResponse.redirect(successUrl, 303);
}
