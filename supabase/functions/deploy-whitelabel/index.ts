import { corsHeaders } from "../_shared/cors.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Full HammaBop schema SQL — applied to target Supabase project
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA_SQL = `
-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id     bigint UNIQUE,
  name            text,
  phone           text,
  region          text,
  role            text NOT NULL DEFAULT 'user',
  avatar_url      text,
  referral_code   text,
  wallet_balance  integer NOT NULL DEFAULT 0,
  cashback_balance integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code) WHERE referral_code IS NOT NULL;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "users update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "admin full users" ON users USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  price           integer NOT NULL DEFAULT 0,
  old_price       integer,
  category        text,
  image_urls      text[] DEFAULT '{}',
  video_url       text,
  stock_count     integer DEFAULT 0,
  sold_count      integer DEFAULT 0,
  sizes           text[] DEFAULT '{}',
  colors          text[] DEFAULT '{}',
  cashback_amount integer DEFAULT 0,
  delivery_fee    integer DEFAULT 0,
  delivery_free   boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  is_recommended  boolean DEFAULT false,
  partner_id      uuid,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads products" ON products FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin manage products" ON products USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES users(id),
  customer_name        text,
  customer_phone       text,
  customer_region      text,
  items                jsonb DEFAULT '[]',
  total_amount         integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'yangi',
  payment_status       text DEFAULT 'kutilmoqda',
  payment_method       text DEFAULT 'cash',
  promo_code           text,
  discount_amount      integer DEFAULT 0,
  order_delivery_fee   integer DEFAULT 0,
  address_detail       text,
  selected_size        text,
  selected_color       text,
  notes                text,
  latitude             double precision,
  longitude            double precision,
  courier_telegram_id  bigint,
  invoice_url          text,
  nasiya_status        text,
  tracking_token       uuid DEFAULT gen_random_uuid(),
  pickup_point_id      uuid,
  delivery_type        text DEFAULT 'courier',
  tg_notified          boolean DEFAULT false,
  created_at           timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_idx ON orders(tracking_token);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "anyone insert order" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "admin manage orders" ON orders USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Banners ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  subtitle    text,
  image_url   text,
  link_url    text,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads banners" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "admin manage banners" ON banners USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Promo Sections ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  subtitle    text,
  badge       text,
  image_url   text,
  link_url    text,
  color       text DEFAULT '#1d4f8a',
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE promo_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads promos" ON promo_sections FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin manage promos" ON promo_sections USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text,
  rating      integer CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  is_approved boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads approved reviews" ON product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY IF NOT EXISTS "users insert review" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "admin manage reviews" ON product_reviews USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Partners ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  logo_url        text,
  commission_rate integer DEFAULT 10,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads partners" ON partners FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "admin manage partners" ON partners USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Promo Codes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  discount_type   text NOT NULL DEFAULT 'percent',
  discount_value  integer NOT NULL DEFAULT 0,
  max_uses        integer,
  uses_count      integer DEFAULT 0,
  expires_at      timestamptz,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads active promos" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "admin manage promo_codes" ON promo_codes USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── User Addresses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  label       text DEFAULT 'Uy',
  region      text NOT NULL,
  district    text,
  address     text,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users own addresses" ON user_addresses USING (auth.uid() = user_id);

-- ── Referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid REFERENCES users(id),
  referred_id   uuid REFERENCES users(id),
  bonus_amount  integer DEFAULT 10000,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

-- ── Recently Viewed ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id  uuid,
  viewed_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users own views" ON recently_viewed USING (auth.uid() = user_id);

-- ── User Balances (Cashback) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_balances (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cashback_balance integer NOT NULL DEFAULT 0,
  total_earned     integer NOT NULL DEFAULT 0,
  total_spent      integer NOT NULL DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users read own balance" ON user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "service manage balance" ON user_balances USING (true);

-- ── Pickup Points ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  address     text,
  region      text,
  latitude    double precision,
  longitude   double precision,
  phone       text,
  schedule    text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads pickup points" ON pickup_points FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "admin manage pickup points" ON pickup_points USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  user_email  text,
  action      text NOT NULL,
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admin reads audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY IF NOT EXISTS "service insert audit" ON audit_logs FOR INSERT WITH CHECK (true);

-- ── Telegram Sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   bigint UNIQUE NOT NULL,
  phone         text,
  user_id       uuid REFERENCES users(id),
  token         text,
  created_at    timestamptz DEFAULT now()
);

-- ── Telegram Event Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_event_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text,
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ── Payment Settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    text UNIQUE NOT NULL,
  is_active   boolean DEFAULT false,
  config      jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admin manage payment settings" ON payment_settings USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Wallet Transactions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  amount      integer NOT NULL,
  type        text NOT NULL,
  description text,
  order_id    uuid,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "users read own transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "service manage transactions" ON wallet_transactions USING (true);

-- ── Site Settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key   text PRIMARY KEY,
  value text
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anyone reads site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin manage site settings" ON site_settings USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ── Cashback RPC ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_cashback(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users SET cashback_balance = cashback_balance + p_amount WHERE id = p_user_id;
  INSERT INTO user_balances(user_id, cashback_balance, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    cashback_balance = user_balances.cashback_balance + p_amount,
    total_earned     = user_balances.total_earned + p_amount,
    updated_at       = now();
END;
$$;
GRANT EXECUTE ON FUNCTION increment_cashback(uuid, integer) TO anon, authenticated, service_role;

-- ── Cashback Trigger ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_apply_cashback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_cashback integer;
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

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
`;

// ─────────────────────────────────────────────────────────────────────────────
// SSE helpers
// ─────────────────────────────────────────────────────────────────────────────
function sseEvent(type: string, data: object): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function log(
  controller: ReadableStreamDefaultController,
  level: "info" | "success" | "error" | "warn",
  message: string,
  detail?: string,
) {
  controller.enqueue(
    new TextEncoder().encode(
      sseEvent("log", { level, message, detail, ts: Date.now() }),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Run SQL on target Supabase via Management API
// ─────────────────────────────────────────────────────────────────────────────
async function runSql(
  projectRef: string,
  mgmtToken: string,
  sql: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main deploy logic — streams logs via SSE
// ─────────────────────────────────────────────────────────────────────────────
async function deploy(
  config: Record<string, string>,
  controller: ReadableStreamDefaultController,
) {
  const enc = new TextEncoder();
  const push = (chunk: string) =>
    controller.enqueue(enc.encode(chunk));

  // Extract project ref from Supabase URL: https://{ref}.supabase.co
  const urlMatch = config.supabase_url?.match(
    /https:\/\/([a-z0-9]+)\.supabase\.co/,
  );
  if (!urlMatch) {
    log(controller, "error", "Noto'g'ri Supabase URL formati.", "https://{ref}.supabase.co ko'rinishida bo'lishi kerak");
    push(sseEvent("done", { success: false }));
    return;
  }
  const projectRef = urlMatch[1];
  const mgmtToken = config.supabase_mgmt_token;

  log(controller, "info", `Loyiha ref topildi: ${projectRef}`);
  await sleep(300);

  // ── Step 1: Verify connection ────────────────────────────────────────────
  log(controller, "info", "Supabase bilan ulanish tekshirilmoqda...");
  const pingResult = await runSql(projectRef, mgmtToken, "SELECT 1 AS ping");
  if (!pingResult.ok) {
    log(controller, "error", "Ulanish muvaffaqiyatsiz.", pingResult.error);
    push(sseEvent("done", { success: false }));
    return;
  }
  log(controller, "success", "Supabase ulanishi tasdiqlandi ✓");
  await sleep(400);

  // ── Step 2: Apply full schema ────────────────────────────────────────────
  const steps = SCHEMA_SQL.split(/--\s*──[^─]+──+\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const stepLabels = [
    "Extensions o'rnatilmoqda...",
    "users jadvali yaratilmoqda...",
    "products jadvali yaratilmoqda...",
    "orders jadvali yaratilmoqda...",
    "banners jadvali yaratilmoqda...",
    "promo_sections jadvali yaratilmoqda...",
    "product_reviews jadvali yaratilmoqda...",
    "partners jadvali yaratilmoqda...",
    "promo_codes jadvali yaratilmoqda...",
    "user_addresses jadvali yaratilmoqda...",
    "referrals jadvali yaratilmoqda...",
    "recently_viewed jadvali yaratilmoqda...",
    "user_balances jadvali yaratilmoqda...",
    "pickup_points jadvali yaratilmoqda...",
    "audit_logs jadvali yaratilmoqda...",
    "telegram_sessions jadvali yaratilmoqda...",
    "telegram_event_log jadvali yaratilmoqda...",
    "payment_settings jadvali yaratilmoqda...",
    "wallet_transactions jadvali yaratilmoqda...",
    "site_settings jadvali yaratilmoqda...",
    "Cashback RPC funksiyasi...",
    "Cashback trigger...",
    "Realtime yoqilmoqda...",
  ];

  // Run full schema as single query (most reliable)
  log(controller, "info", "To'liq schema SQL ishga tushirilmoqda...");
  await sleep(300);

  // Split into chunks to avoid timeout, run per logical section
  const sqlChunks = splitSqlIntoChunks(SCHEMA_SQL);
  for (let i = 0; i < sqlChunks.length; i++) {
    const label = stepLabels[i] ?? `SQL blok ${i + 1} ishlanmoqda...`;
    log(controller, "info", label);
    const result = await runSql(projectRef, mgmtToken, sqlChunks[i]);
    if (!result.ok) {
      // Non-fatal: some IF NOT EXISTS may still warn, log and continue
      log(controller, "warn", `Ogohlantirish: ${label}`, result.error?.slice(0, 200));
    } else {
      log(controller, "success", `✓ ${label.replace("...", " tayyor")}`);
    }
    await sleep(250);
  }

  // ── Step 3: Seed site_settings ───────────────────────────────────────────
  log(controller, "info", "Brend sozlamalari saqlanmoqda...");
  await sleep(300);

  const brandSettings: Record<string, string> = {
    site_name: config.brand_name || "HammaBop",
    site_name_part1: config.brand_part1 || "Hamma",
    site_name_part2: config.brand_part2 || "Bop",
    brand_color: config.brand_color || "#1d4f8a",
    brand_color2: config.brand_color2 || "#EE7526",
    tagline: config.tagline || "",
    support_phone: config.support_phone || "",
    support_telegram: config.support_telegram || "",
    support_tg_bot: config.support_tg_bot || "",
    footer_text: config.footer_text || "",
    app_domain: config.domain || "",
    app_name: config.app_name || config.brand_name || "HammaBop",
  };

  const upsertValues = Object.entries(brandSettings)
    .map(([k, v]) => `('${k.replace(/'/g, "''")}', '${v.replace(/'/g, "''")}')`)
    .join(",\n  ");

  const seedSql = `
    INSERT INTO site_settings (key, value) VALUES
      ${upsertValues}
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `;

  const seedResult = await runSql(projectRef, mgmtToken, seedSql);
  if (seedResult.ok) {
    log(controller, "success", "✓ Brend sozlamalari saqlandi");
  } else {
    log(controller, "warn", "Brend sozlamalari saqlashda xato", seedResult.error?.slice(0, 200));
  }
  await sleep(300);

  // ── Step 4: Telegram bot token seed (if provided) ────────────────────────
  if (config.telegram_bot_token) {
    log(controller, "info", "Telegram bot token saqlanmoqda...");
    const tgSql = `
      INSERT INTO site_settings (key, value) VALUES
        ('telegram_bot_token', '${config.telegram_bot_token.replace(/'/g, "''")}')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;
    await runSql(projectRef, mgmtToken, tgSql);
    log(controller, "success", "✓ Telegram bot token saqlandi");
    await sleep(200);
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  log(controller, "success", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log(controller, "success", "🚀 Deploy muvaffaqiyatli yakunlandi!");
  log(controller, "success", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Generate .env output for the frontend deployment
  const envOutput = [
    `VITE_SUPABASE_URL=${config.supabase_url}`,
    `VITE_SUPABASE_ANON_KEY=${config.supabase_anon_key}`,
    `# App: ${config.brand_name} — ${config.domain}`,
    `# Server: ${config.server_ip}`,
  ].join("\n");

  push(sseEvent("done", { success: true, envOutput }));
  controller.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function splitSqlIntoChunks(sql: string): string[] {
  // Split on our section comments
  const raw = sql.split(/--\s*──[^\n]+\n/).filter(s => s.trim());
  // Group into chunks of ~3 sections each to avoid timeouts
  const chunks: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i++) {
    current += raw[i];
    if ((i + 1) % 3 === 0 || i === raw.length - 1) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
    }
  }
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let config: Record<string, string> = {};
  try {
    config = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Required fields
  if (!config.supabase_url || !config.supabase_mgmt_token) {
    return new Response(
      JSON.stringify({ error: "supabase_url va supabase_mgmt_token talab qilinadi" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      deploy(config, controller).catch((err) => {
        const enc = new TextEncoder();
        controller.enqueue(
          enc.encode(
            sseEvent("log", {
              level: "error",
              message: "Kutilmagan xato: " + String(err),
              ts: Date.now(),
            }),
          ),
        );
        controller.enqueue(enc.encode(sseEvent("done", { success: false })));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
