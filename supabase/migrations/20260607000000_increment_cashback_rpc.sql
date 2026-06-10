-- Atomic cashback increment — avoids race conditions from stale client-side balance reads
create or replace function increment_cashback(user_id uuid, amount numeric)
returns void
language sql
security definer
as $$
  update users
  set cashback_balance = cashback_balance + amount
  where id = user_id;
$$;
