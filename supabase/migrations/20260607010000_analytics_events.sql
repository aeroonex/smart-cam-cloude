-- #13 Mobil analitika — user-behavior tracking eventlari
create table if not exists public.analytics_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  event_name  text not null,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

-- Har kim (jumladan anonim) o'z eventini yoza oladi
drop policy if exists analytics_insert_any on public.analytics_events;
create policy analytics_insert_any on public.analytics_events
  for insert with check (true);

-- Faqat adminlar o'qiy oladi (analitika dashboard uchun)
drop policy if exists analytics_select_admin on public.analytics_events;
create policy analytics_select_admin on public.analytics_events
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
