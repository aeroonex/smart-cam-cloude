-- ╔══════════════════════════════════════════════════════════╗
-- ║  Faza 2 — Sotuvchi (seller) roli tizimi                    ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1) role ustuniga 'seller' va 'courier' qiymatlarini ruxsat berish.
--    (role text bo'lsa check-constraint, enum bo'lsa enum qiymati qo'shiladi)
do $$
begin
  -- enum bo'lsa qiymat qo'shamiz
  if exists (select 1 from pg_type where typname = 'user_role') then
    begin
      alter type user_role add value if not exists 'seller';
    exception when others then null; end;
    begin
      alter type user_role add value if not exists 'courier';
    exception when others then null; end;
  end if;
end $$;

-- text + check constraint variantida — constraintni yangilash
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.users'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';
  if cname is not null then
    execute format('alter table public.users drop constraint %I', cname);
  end if;
  -- agar role text bo'lsa yangi constraint
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='users' and column_name='role') = 'text' then
    alter table public.users
      add constraint users_role_check
      check (role in ('user','admin','seller','courier'));
  end if;
end $$;

-- 2) Sotuvchi-ga oid qo'shimcha ustunlar
alter table public.users
  add column if not exists login_code   text,          -- sotuvchining kirish logini
  add column if not exists is_active    boolean not null default true,
  add column if not exists created_by   uuid references public.users(id),
  add column if not exists seller_note  text;

create unique index if not exists users_login_code_uniq
  on public.users (login_code) where login_code is not null;

-- 3) Buyurtma topshirish — qaysi sotuvchi qaysi buyurtmani topshirdi
alter table public.orders
  add column if not exists delivered_by  uuid references public.users(id),
  add column if not exists delivered_at  timestamptz,
  add column if not exists handover_code text;        -- chekdagi QR qiymati

-- handover_code ni avtomat to'ldirish (mavjud buyurtmalar uchun)
update public.orders set handover_code = id::text where handover_code is null;

-- 4) Sotuvchi profil o'zgarishlari auditi (admin push uchun)
create table if not exists public.seller_profile_changes (
  id          bigserial primary key,
  seller_id   uuid not null references public.users(id) on delete cascade,
  field       text not null,                 -- 'login_code' | 'password' | 'full_name' ...
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now(),
  notified    boolean not null default false
);
create index if not exists spc_seller_idx on public.seller_profile_changes (seller_id);
create index if not exists spc_unnotified_idx on public.seller_profile_changes (notified) where notified = false;

alter table public.seller_profile_changes enable row level security;

drop policy if exists spc_seller_insert on public.seller_profile_changes;
create policy spc_seller_insert on public.seller_profile_changes
  for insert with check (auth.uid() = seller_id);

drop policy if exists spc_admin_all on public.seller_profile_changes;
create policy spc_admin_all on public.seller_profile_changes
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 5) Sotuvchi statistikasi — view (admin analitikasi uchun)
create or replace view public.seller_stats as
select
  s.id                                   as seller_id,
  s.full_name,
  s.login_code,
  s.is_active,
  s.created_at                           as joined_at,
  count(o.id)                            as handovers_total,
  count(o.id) filter (where o.delivered_at >= now() - interval '7 days')  as handovers_week,
  count(o.id) filter (where o.delivered_at >= date_trunc('day', now()))   as handovers_today,
  coalesce(sum(o.total_amount), 0)       as revenue_total,
  max(o.delivered_at)                    as last_handover_at
from public.users s
left join public.orders o on o.delivered_by = s.id
where s.role = 'seller'
group by s.id;

-- 6) Sotuvchi buyurtmani topshirildi deb belgilaydi (QR/kod orqali)
--    Faqat seller roli chaqira oladi; buyurtma statusini yakunlaydi.
create or replace function public.seller_handover(p_code text)
returns table (order_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_uid  uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  select role into v_role from public.users where id = v_uid;
  if v_role not in ('seller','courier','admin') then
    raise exception 'forbidden';
  end if;

  select * into v_order from public.orders
  where handover_code = p_code or id::text = p_code
  limit 1;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.delivered_at is not null then
    raise exception 'already_delivered';
  end if;

  update public.orders
  set delivered_by = v_uid,
      delivered_at = now(),
      status = 'mijoz_qabul_qildi',
      updated_at = now()
  where id = v_order.id;

  return query select v_order.id, 'mijoz_qabul_qildi'::text;
end;
$$;

-- 7) Sotuvchi o'z login/parol/ismini o'zgartirsa — admin uchun audit yozuvi
create or replace function public.log_seller_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'seller' then
    if new.login_code is distinct from old.login_code then
      insert into public.seller_profile_changes(seller_id, field, old_value, new_value)
      values (new.id, 'login_code', old.login_code, new.login_code);
    end if;
    if new.full_name is distinct from old.full_name then
      insert into public.seller_profile_changes(seller_id, field, old_value, new_value)
      values (new.id, 'full_name', old.full_name, new.full_name);
    end if;
    if new.phone is distinct from old.phone then
      insert into public.seller_profile_changes(seller_id, field, old_value, new_value)
      values (new.id, 'phone', old.phone, new.phone);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seller_profile_change on public.users;
create trigger trg_seller_profile_change
  after update on public.users
  for each row execute function public.log_seller_profile_change();
