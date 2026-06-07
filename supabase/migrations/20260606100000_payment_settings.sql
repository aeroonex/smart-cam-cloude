create table if not exists payment_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('click', 'payme')),
  enabled boolean not null default false,
  merchant_id text,
  service_id text,
  merchant_user_id text,
  secret_key text,
  test_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payment_settings enable row level security;

create policy "admin_all" on payment_settings
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

insert into payment_settings (provider, enabled, test_mode)
values ('click', false, true), ('payme', false, true)
on conflict (provider) do nothing;

create or replace function update_payment_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_payment_settings_updated_at
  before update on payment_settings
  for each row execute function update_payment_settings_updated_at();

alter table orders
  add column if not exists payment_status text default 'pending' check (payment_status in ('pending','paid','failed')),
  add column if not exists payment_provider text,
  add column if not exists payment_transaction_id text;
