-- Mahsulotlarni "Tavsiya etamiz" bo'limida ko'rsatish uchun bayroq
alter table public.products
  add column if not exists is_recommended boolean not null default false;

-- Tavsiya etilgan faol mahsulotlarni tez topish uchun indeks
create index if not exists products_recommended_idx
  on public.products (is_recommended)
  where status = 'active';
