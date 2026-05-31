-- Add category and sold_count to products
alter table public.products
  add column if not exists category text,
  add column if not exists sold_count integer not null default 0,
  add column if not exists specifications jsonb;

-- Product reviews table
create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- One review per user per product
create unique index if not exists product_reviews_user_product
  on public.product_reviews(user_id, product_id);

-- RLS
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
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function: increment sold_count when order is placed
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
