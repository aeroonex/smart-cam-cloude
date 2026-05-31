# Supabase Dashboard'da ishlatish kerak bo'lgan SQL-lar

Quyidagi SQL'larni **Supabase Dashboard → SQL Editor** da ketma-ket ishlatib chiqing.

---

## 1. Products jadvaliga yangi ustunlar

```sql
alter table public.products
  add column if not exists category text,
  add column if not exists sold_count integer not null default 0,
  add column if not exists specifications jsonb,
  add column if not exists videos text[];
```

---

## 2. Product reviews jadvali

```sql
create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create unique index if not exists product_reviews_user_product
  on public.product_reviews(user_id, product_id);

alter table public.product_reviews enable row level security;

create policy "Anyone can read reviews"
  on public.product_reviews for select using (true);

create policy "Auth users insert own review"
  on public.product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users update own review"
  on public.product_reviews for update
  using (auth.uid() = user_id);

create policy "Admins delete any review"
  on public.product_reviews for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
```

---

## 3. Sold count trigger

```sql
create or replace function public.increment_product_sold_count()
returns trigger language plpgsql security definer as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(NEW.items)
  loop
    update public.products
    set sold_count = sold_count + (item->>'quantity')::integer
    where id = (item->>'product_id')::uuid;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists trg_increment_sold_count on public.orders;
create trigger trg_increment_sold_count
  after insert on public.orders
  for each row execute function public.increment_product_sold_count();
```

---

## 4. Supabase Storage bucket (product-media)

Supabase Dashboard → **Storage** → **New bucket**:
- Name: `product-media`
- Public: ✅ ON
- Max upload size: 50 MB

Yoki SQL orqali:
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media', 'product-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

create policy "Public read product-media"
  on storage.objects for select
  using (bucket_id = 'product-media');

create policy "Admins upload product-media"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media' and
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins delete product-media"
  on storage.objects for delete
  using (
    bucket_id = 'product-media' and
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
```
