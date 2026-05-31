-- Bosh sahifa bannerlari — admin yuklaydi (rasm + havola)
create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  link_url    text,
  title       text,
  subtitle    text,
  badge       text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists banners_active_sort_idx
  on public.banners (is_active, sort_order);

alter table public.banners enable row level security;

drop policy if exists "Anyone can read active banners" on public.banners;
create policy "Anyone can read active banners"
  on public.banners for select using (true);

drop policy if exists "Admins manage banners" on public.banners;
create policy "Admins manage banners"
  on public.banners for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
