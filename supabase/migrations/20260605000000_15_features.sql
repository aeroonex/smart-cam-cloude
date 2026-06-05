-- ══════════════════════════════════════════════════════════════════════════════
-- 15 Features Migration — HammaBop
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Orders: tracking token + location + courier + invoice ─────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token uuid DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_telegram_id bigint;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nasiya_status text; -- 'pending','approved','rejected'

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_idx ON orders(tracking_token);

-- Public tracking function (anon can call, returns only safe fields)
CREATE OR REPLACE FUNCTION get_order_by_tracking_token(p_token uuid)
RETURNS TABLE (
  id           uuid,
  status       text,
  payment_status text,
  customer_name  text,
  customer_region text,
  total_amount   integer,
  items          jsonb,
  created_at     timestamptz,
  tracking_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.status::text,
    o.payment_status::text,
    o.customer_name,
    o.customer_region,
    o.total_amount,
    o.items::jsonb,
    o.created_at,
    o.tracking_token
  FROM orders o
  WHERE o.tracking_token = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_by_tracking_token(uuid) TO anon, authenticated;

-- ─── 11. User balances (Cashback 2%) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_balances (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cashback_balance integer NOT NULL DEFAULT 0,
  total_earned     integer NOT NULL DEFAULT 0,
  total_spent      integer NOT NULL DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users read own balance"
  ON user_balances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "service insert balance"
  ON user_balances FOR ALL USING (true);

-- Trigger: 2% cashback when order delivered
CREATE OR REPLACE FUNCTION fn_apply_cashback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cashback integer;
BEGIN
  IF NEW.status = 'mijoz_qabul_qildi'
     AND OLD.status IS DISTINCT FROM 'mijoz_qabul_qildi'
     AND NEW.user_id IS NOT NULL THEN
    v_cashback := GREATEST(ROUND(NEW.total_amount::numeric * 0.02)::integer, 0);
    INSERT INTO user_balances(user_id, cashback_balance, total_earned, updated_at)
    VALUES (NEW.user_id, v_cashback, v_cashback, now())
    ON CONFLICT (user_id) DO UPDATE SET
      cashback_balance = user_balances.cashback_balance + v_cashback,
      total_earned     = user_balances.total_earned + v_cashback,
      updated_at       = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_cashback ON orders;
CREATE TRIGGER trg_orders_cashback
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_apply_cashback();

-- ─── 15. Audit Logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  user_email  text,
  action      text NOT NULL,      -- 'INSERT','UPDATE','DELETE'
  table_name  text NOT NULL,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  changed_fields text[],
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON audit_logs(table_name, record_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admins read audit_logs"
  ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "service insert audit_logs"
  ON audit_logs FOR INSERT WITH CHECK (true);

-- Audit trigger function (products + orders)
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_changed text[];
  v_old     jsonb;
  v_new     jsonb;
  v_key     text;
BEGIN
  v_old := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO v_changed
    FROM jsonb_each(v_old) AS o(key, val)
    WHERE v_new ->> key IS DISTINCT FROM val::text;
  END IF;

  INSERT INTO audit_logs(
    user_id, action, table_name, record_id,
    old_data, new_data, changed_fields, created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    v_old,
    v_new,
    v_changed,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit to products and orders
DROP TRIGGER IF EXISTS trg_products_audit ON products;
CREATE TRIGGER trg_products_audit
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_orders_audit ON orders;
CREATE TRIGGER trg_orders_audit
  AFTER UPDATE OF status, payment_status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ─── 9. Low Stock Alert (pg_notify) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_low_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock_count < 3
     AND (OLD.stock_count IS NULL OR OLD.stock_count >= 3) THEN
    PERFORM pg_notify('low_stock', json_build_object(
      'product_id',  NEW.id::text,
      'name',        NEW.name,
      'stock_count', NEW.stock_count,
      'category',    NEW.category,
      'store_name',  NEW.store_name
    )::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_alert ON products;
CREATE TRIGGER trg_stock_alert
  AFTER UPDATE OF stock_count ON products
  FOR EACH ROW EXECUTE FUNCTION fn_notify_low_stock();

-- ─── 10. Courier Assignments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courier_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_telegram_id bigint NOT NULL,
  courier_name        text,
  assigned_at         timestamptz DEFAULT now(),
  confirmed_at        timestamptz,
  delivered_at        timestamptz,
  UNIQUE(order_id)
);

ALTER TABLE courier_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service manage courier_assignments"
  ON courier_assignments USING (true);

-- ─── 8. Partner Store Telegram Groups ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_telegram_groups (
  store_id      text PRIMARY KEY,
  group_chat_id bigint NOT NULL,
  store_name    text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE store_telegram_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins manage store groups"
  ON store_telegram_groups USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 7. Cart Snapshots (Abandoned Cart) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  telegram_id bigint,
  cart_data   jsonb NOT NULL DEFAULT '[]',
  item_count  integer DEFAULT 0,
  alerted_at  timestamptz,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE cart_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users own cart_snapshots"
  ON cart_snapshots USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "service manage cart_snapshots"
  ON cart_snapshots USING (true);

-- ─── 14. Referrals enhancement ────────────────────────────────────────────────
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_bonus   integer DEFAULT 10000;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_bonus   integer DEFAULT 5000;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS is_activated     boolean DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS activated_at     timestamptz;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS activated_order_id uuid;

-- Trigger: activate referral bonus when referred user makes first order
CREATE OR REPLACE FUNCTION fn_activate_referral()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ref       referrals%ROWTYPE;
  v_ref_bonus integer;
  v_new_bonus integer;
BEGIN
  -- Only on first completed order
  IF NEW.status = 'mijoz_qabul_qildi'
     AND OLD.status IS DISTINCT FROM 'mijoz_qabul_qildi'
     AND NEW.user_id IS NOT NULL THEN

    SELECT * INTO v_ref FROM referrals
    WHERE referred_id = NEW.user_id AND is_activated = false
    LIMIT 1;

    IF FOUND THEN
      v_ref_bonus := COALESCE(v_ref.referrer_bonus, 10000);
      v_new_bonus := COALESCE(v_ref.referred_bonus, 5000);

      -- Bonus to referrer
      INSERT INTO user_balances(user_id, cashback_balance, total_earned, updated_at)
      VALUES (v_ref.referrer_id, v_ref_bonus, v_ref_bonus, now())
      ON CONFLICT (user_id) DO UPDATE SET
        cashback_balance = user_balances.cashback_balance + v_ref_bonus,
        total_earned     = user_balances.total_earned + v_ref_bonus,
        updated_at       = now();

      -- Bonus to new user
      INSERT INTO user_balances(user_id, cashback_balance, total_earned, updated_at)
      VALUES (NEW.user_id, v_new_bonus, v_new_bonus, now())
      ON CONFLICT (user_id) DO UPDATE SET
        cashback_balance = user_balances.cashback_balance + v_new_bonus,
        total_earned     = user_balances.total_earned + v_new_bonus,
        updated_at       = now();

      -- Mark referral activated
      UPDATE referrals SET
        is_activated       = true,
        activated_at       = now(),
        activated_order_id = NEW.id
      WHERE id = v_ref.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_activate ON orders;
CREATE TRIGGER trg_referral_activate
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_activate_referral();

-- ─── 6. Nasiya scoring result handler ─────────────────────────────────────────
-- Webhook: /api/nasiya-callback sets nasiya_status on orders
-- (nasiya_status column already added above)
CREATE INDEX IF NOT EXISTS orders_nasiya_idx ON orders(nasiya_status) WHERE nasiya_status IS NOT NULL;

-- ─── Indexes for performance ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_user_id_created_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx           ON orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx   ON orders(payment_status);
CREATE INDEX IF NOT EXISTS products_status_created_idx ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_idx       ON products(category);
CREATE INDEX IF NOT EXISTS products_stock_idx          ON products(stock_count) WHERE stock_count < 5;
CREATE INDEX IF NOT EXISTS cart_snapshots_updated_idx  ON cart_snapshots(updated_at);
