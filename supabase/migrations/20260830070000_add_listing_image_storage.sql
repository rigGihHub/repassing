insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images','listing-images',true,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "listing images authenticated upload" on storage.objects;
create policy "listing images authenticated upload" on storage.objects for insert to authenticated
with check (bucket_id='listing-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists "listing images owner select" on storage.objects;
create policy "listing images owner select" on storage.objects for select to authenticated
using (bucket_id='listing-images' and owner_id=(select auth.uid()::text));
drop policy if exists "listing images owner delete" on storage.objects;
create policy "listing images owner delete" on storage.objects for delete to authenticated
using (bucket_id='listing-images' and owner_id=(select auth.uid()::text));
drop policy if exists "listing images owner update" on storage.objects;
create policy "listing images owner update" on storage.objects for update to authenticated
using (bucket_id='listing-images' and owner_id=(select auth.uid()::text))
with check (bucket_id='listing-images' and owner_id=(select auth.uid()::text));
