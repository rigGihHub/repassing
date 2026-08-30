import {createSupabaseServerClient} from '@/src/shared/supabase/server';

export type MarketplaceListing = {
  id: string;
  title: string;
  description: string | null;
  sizeLabel: string | null;
  condition: string;
  priceMinor: number;
  currency: string;
  publishedAt: string | null;
  organizationName: string | null;
  categoryName: string | null;
  sportName: string | null;
  brandName: string | null;
};

export type MarketplaceReferenceData = {
  organizations: {id: string; name: string}[];
  teams: {id: string; name: string; organizationId: string}[];
  sports: {id: string; code: string; nameKey: string}[];
  categories: {id: string; code: string; nameKey: string}[];
  brands: {id: string; name: string}[];
};

export async function getActiveMarketplaceListings(limit = 24): Promise<MarketplaceListing[]> {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('listings')
    .select('id,title,description,size_label,condition,price_minor,currency,published_at,organization:organizations(name),category:categories(name_key),sport:sports(name_key),brand:brands(name)')
    .eq('status', 'ACTIVE')
    .eq('moderation_state', 'CLEAR')
    .order('published_at', {ascending: false, nullsFirst: false})
    .limit(limit);
  if (error) throw new Error(`Could not load marketplace listings: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    sizeLabel: row.size_label,
    condition: row.condition,
    priceMinor: Number(row.price_minor),
    currency: row.currency,
    publishedAt: row.published_at,
    organizationName: (Array.isArray(row.organization) ? row.organization[0] : row.organization)?.name ?? null,
    categoryName: (Array.isArray(row.category) ? row.category[0] : row.category)?.name_key ?? null,
    sportName: (Array.isArray(row.sport) ? row.sport[0] : row.sport)?.name_key ?? null,
    brandName: (Array.isArray(row.brand) ? row.brand[0] : row.brand)?.name ?? null
  }));
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

export async function getListingsForSeller(userId: string, limit = 20) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('listings')
    .select('id,title,status,price_minor,currency,created_at,published_at')
    .eq('seller_user_id', userId)
    .order('created_at', {ascending:false})
    .limit(limit);
  if (error) throw new Error(`Could not load seller listings: ${error.message}`);
  return data ?? [];
}
