/**
 * admin-create-seller — Admin panelidan yangi sotuvchi hisobini yaratadi.
 *
 * POST /functions/v1/admin-create-seller
 * Headers: Authorization: Bearer <admin JWT>
 * Body: { login: string, password: string, full_name: string, phone?: string, note?: string }
 *
 * Sotuvchi keyinchalik `login` + `password` bilan tizimga kiradi.
 * (login ichki ravishda `<login>@seller.hammabop.app` email-ga aylantiriladi)
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY        = Deno.env.get("SUPABASE_ANON_KEY")!;

const SELLER_EMAIL_DOMAIN = "seller.hammabop.app";
export const loginToEmail = (login: string) =>
  `${login.trim().toLowerCase()}@${SELLER_EMAIL_DOMAIN}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1) Chaqiruvchi admin ekanligini tekshirish
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "no_token" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await userClient.auth.getUser();
  if (!caller) return json({ error: "unauthorized" }, 401);

  const { data: callerRow } = await admin
    .from("users").select("role").eq("id", caller.id).single();
  if (callerRow?.role !== "admin") return json({ error: "forbidden" }, 403);

  // 2) Input
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const login = (body.login ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const full_name = (body.full_name ?? "").trim();
  if (!login || password.length < 6 || !full_name) {
    return json({ error: "invalid_input", message: "login, parol (≥6) va ism majburiy" }, 400);
  }

  const email = loginToEmail(login);

  // 3) Auth foydalanuvchi yaratish (email tasdiqlanган holda)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "seller", login_code: login },
  });
  if (createErr || !created.user) {
    return json({ error: "create_failed", message: createErr?.message }, 400);
  }

  // 4) users jadvaliga yozuv
  const { error: rowErr } = await admin.from("users").upsert({
    id: created.user.id,
    google_id: created.user.id,
    full_name,
    email,
    phone: body.phone ?? null,
    role: "seller",
    login_code: login,
    is_active: true,
    created_by: caller.id,
    seller_note: body.note ?? null,
  });
  if (rowErr) {
    // rollback — auth user ni o'chiramiz
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "row_failed", message: rowErr.message }, 400);
  }

  return json({ ok: true, seller_id: created.user.id, login, email });
});
