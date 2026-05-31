-- Add videos column to products
alter table public.products
  add column if not exists videos text[];

-- Supabase Storage bucket for product media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800, -- 50 MB
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Public can read product-media"
  on storage.objects for select
  using (bucket_id = 'product-media');

create policy "Admins can upload product-media"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media' and
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete product-media"
  on storage.objects for delete
  using (
    bucket_id = 'product-media' and
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
