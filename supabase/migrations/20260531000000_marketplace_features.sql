-- ══════════════════════════════════════════════════════════
-- Marketplace 25 Features Migration
-- ══════════════════════════════════════════════════════════

-- products: yangi ustunlar
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cashback_amount integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_free boolean DEFAULT false;

-- users: wallet va referral
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cashback_balance integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code) WHERE referral_code IS NOT NULL;

-- orders: to'lov, promo, yetkazish
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_delivery_fee integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_detail text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_size text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_color text;

-- promo_codes jadvali
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  uses_count integer DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- user_addresses jadvali
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  label text DEFAULT 'Uy',
  region text NOT NULL,
  district text,
  address text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users own addresses" ON user_addresses USING (auth.uid() = user_id);

-- referrals jadvali
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id),
  referred_id uuid REFERENCES users(id),
  bonus_amount integer DEFAULT 10000,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

-- recently_viewed jadvali
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users own views" ON recently_viewed USING (auth.uid() = user_id);

-- promo_codes RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone can read active promos" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "admin manage promos" ON promo_codes USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- referrals RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users see own referrals" ON referrals USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
