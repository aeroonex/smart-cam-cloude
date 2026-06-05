-- Pickup points table for order page map
create table if not exists public.pickup_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  working_hours text default '09:00–18:00',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pickup_points enable row level security;

-- Anyone can read active pickup points
create policy "Public read pickup_points"
  on public.pickup_points for select
  using (is_active = true);

-- Only service role / admin can insert/update/delete (via RLS bypass)
create policy "Admin manage pickup_points"
  on public.pickup_points for all
  using (true)
  with check (true);

-- Seed: default Toshkent pickup points
insert into public.pickup_points (name, address, lat, lng, working_hours, phone) values
  ('HammaBop Markaz', 'Toshkent, Amir Temur ko''chasi 107B', 41.2995, 69.2401, '09:00–20:00', '+998 71 123 45 67'),
  ('HammaBop Yunusobod', 'Toshkent, Yunusobod tumani, 19-kvartal', 41.3614, 69.2839, '09:00–19:00', '+998 71 234 56 78'),
  ('HammaBop Chilonzor', 'Toshkent, Chilonzor tumani, Qatortol ko''chasi 46', 41.2724, 69.2057, '09:00–19:00', '+998 71 345 67 89');
