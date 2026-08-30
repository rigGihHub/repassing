import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export type MarketplaceListing = {
  id: string;
  sellerUserId: string;
  title: string;
  description: string | null;
  sizeLabel: string | null;
  condition: string;
  priceMinor: number;
  currency: string;
  status: string;
  publishedAt: string | null;
  reservedAt: string | null;
  soldAt: string | null;
  organizationId: string | null;
  teamId: string | null;
  sportId: string | null;
  categoryId: string | null;
  brandId: string | null;
  organizationName: string | null;
  teamName: string | null;
  categoryName: string | null;
  sportName: string | null;
  brandName: string | null;
  imageUrl: string | null;
  imageUrls: string[];
};

export type MarketplaceReferenceData = {
  organizations: {id: string; name: string}[];
  teams: {id: string; name: string; organizationId: string}[];
  sports: {id: string; code: string; nameKey: string}[];
  categories: {id: string; code: string; nameKey: string}[];
  brands: {id: string; name: string}[];
};

export type MarketplaceSearchFilters = {
  query?: string;
  organizationId?: string;
  teamId?: string;
  sportId?: string;
  categoryId?: string;
  brandId?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  currency?: string;
  sizeLabel?: string;
  limit?: number;
};

const listingSelect = 'id,seller_user_id,title,description,size_label,condition,price_minor,currency,status,published_at,reserved_at,sold_at,organization_id,team_id,sport_id,category_id,brand_id,organization:organizations(name),team:teams(name),category:categories(name_key),sport:sports(name_key),brand:brands(name),images:listing_images(storage_bucket,storage_path,sort_order)';

function mapListing(row: any, supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): MarketplaceListing {
  const imageUrls = (row.images ?? [])
    .sort((a:any,b:any)=>a.sort_order-b.sort_order)
    .map((image:any)=>supabase.storage.from(image.storage_bucket).getPublicUrl(image.storage_path).data.publicUrl);
  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    title: row.title,
    description: row.description,
    sizeLabel: row.size_label,
    condition: row.condition,
    priceMinor: Number(row.price_minor),
    currency: row.currency,
    status: row.status,
    publishedAt: row.published_at,
    reservedAt: row.reserved_at,
    soldAt: row.sold_at,
    organizationId: row.organization_id,
    teamId: row.team_id,
    sportId: row.sport_id,
    categoryId: row.category_id,
    brandId: row.brand_id,
    organizationName: (Array.isArray(row.organization) ? row.organization[0] : row.organization)?.name ?? null,
    teamName: (Array.isArray(row.team) ? row.team[0] : row.team)?.name ?? null,
    categoryName: (Array.isArray(row.category) ? row.category[0] : row.category)?.name_key ?? null,
    sportName: (Array.isArray(row.sport) ? row.sport[0] : row.sport)?.name_key ?? null,
    brandName: (Array.isArray(row.brand) ? row.brand[0] : row.brand)?.name ?? null,
    imageUrl: imageUrls[0] ?? null,
    imageUrls
  };
}

export async function getActiveMarketplaceListings(limit = 24): Promise<MarketplaceListing[]> {
  return searchMarketplaceListings({limit});
}

export async function searchMarketplaceListings(filters: MarketplaceSearchFilters = {}): Promise<MarketplaceListing[]> {
  const supabase = await createSupabaseServerClient();
  const args = {
    p_query: filters.query?.trim() || null,
    p_organization_id: filters.organizationId || null,
    p_team_id: filters.teamId || null,
    p_sport_id: filters.sportId || null,
    p_category_id: filters.categoryId || null,
    p_brand_id: filters.brandId || null,
    p_min_price_minor: filters.minPriceMinor ?? null,
    p_max_price_minor: filters.maxPriceMinor ?? null,
    p_currency: filters.currency || null,
    p_limit: Math.min(Math.max(filters.limit ?? 40, 1), 100),
    p_offset: 0
  };
  const {data: hits, error: searchError} = await supabase.rpc('search_marketplace', args);
  if (searchError) throw new Error(`Could not search marketplace: ${searchError.message}`);
  const normalizedSize = filters.sizeLabel?.trim().toLocaleLowerCase();
  const filteredHits = normalizedSize ? (hits ?? []).filter((hit:any)=>String(hit.size_label ?? '').trim().toLocaleLowerCase() === normalizedSize) : (hits ?? []);
  const ids = filteredHits.map((hit:any)=>hit.id as string);
  if (!ids.length) return [];
  const {data, error} = await supabase.from('listings').select(listingSelect).in('id', ids);
  if (error) throw new Error(`Could not load marketplace listings: ${error.message}`);
  const byId = new Map((data ?? []).map((row:any)=>[row.id, mapListing(row,supabase)]));
  return ids.map((id:string)=>byId.get(id)).filter(Boolean) as MarketplaceListing[];
}

export async function getMarketplaceListing(id: string): Promise<MarketplaceListing | null> {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.from('listings').select(listingSelect).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load marketplace listing: ${error.message}`);
  return data ? mapListing(data,supabase) : null;
}

export async function getMarketplaceReferenceData(): Promise<MarketplaceReferenceData> {
  const supabase = await createSupabaseServerClient();
  const [{data: organizations}, {data: teams}, {data: sports}, {data: categories}, {data: brands}] = await Promise.all([
    supabase.from('organizations').select('id,name').eq('status','ACTIVE').order('name'),
    supabase.from('teams').select('id,name,organization_id').eq('status','ACTIVE').order('name'),
    supabase.from('sports').select('id,code,name_key').eq('status','ACTIVE').order('code'),
    supabase.from('categories').select('id,code,name_key').eq('status','ACTIVE').order('code'),
    supabase.from('brands').select('id,name').eq('status','ACTIVE').order('name')
  ]);
  return {
    organizations: (organizations ?? []).map((x:any)=>({id:x.id,name:x.name})),
    teams: (teams ?? []).map((x:any)=>({id:x.id,name:x.name,organizationId:x.organization_id})),
    sports: (sports ?? []).map((x:any)=>({id:x.id,code:x.code,nameKey:x.name_key})),
    categories: (categories ?? []).map((x:any)=>({id:x.id,code:x.code,nameKey:x.name_key})),
    brands: (brands ?? []).map((x:any)=>({id:x.id,name:x.name}))
  };
}

export async function getFavoriteListingIds(userId: string): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
  if (error) throw new Error(`Could not load favorites: ${error.message}`);
  return new Set((data ?? []).map((row:any)=>row.listing_id as string));
}

export async function getFavoriteListings(userId: string, limit = 60): Promise<MarketplaceListing[]> {
  const supabase = await createSupabaseServerClient();
  const {data: favorites, error: favoriteError} = await supabase
    .from('favorites')
    .select('listing_id,created_at')
    .eq('user_id', userId)
    .order('created_at', {ascending:false})
    .limit(limit);
  if (favoriteError) throw new Error(`Could not load favorites: ${favoriteError.message}`);
  const ids = (favorites ?? []).map((row:any)=>row.listing_id as string);
  if (!ids.length) return [];
  const {data, error} = await supabase.from('listings').select(listingSelect).in('id', ids).eq('status','ACTIVE').eq('moderation_state','CLEAR');
  if (error) throw new Error(`Could not load favorite listings: ${error.message}`);
  const byId = new Map((data ?? []).map((row:any)=>[row.id, mapListing(row,supabase)]));
  return ids.map((id:string)=>byId.get(id)).filter(Boolean) as MarketplaceListing[];
}

export async function getListingsForSeller(userId: string, limit = 20) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('listings')
    .select('id,title,status,price_minor,currency,created_at,published_at')
    .eq('seller_user_id', userId)
    .neq('status','REMOVED')
    .order('created_at', {ascending:false})
    .limit(limit);
  if (error) throw new Error(`Could not load seller listings: ${error.message}`);
  return data ?? [];
}
