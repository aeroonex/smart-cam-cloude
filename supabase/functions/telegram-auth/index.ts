import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const enc = new TextEncoder();

function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Telegram Login Widget verification
async function verifyWidgetData(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const { hash, ...fields } = data;
  const checkStr = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await crypto.subtle.digest("SHA-256", enc.encode(BOT_TOKEN));
  const hmacKey = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(checkStr));
  if (toHex(sig) !== hash) throw new Error("Invalid widget auth data");
  if (Date.now() / 1000 - Number(fields.auth_date) > 86400) throw new Error("Auth data expired");
  return fields;
}

// Telegram Mini App initData verification
async function verifyInitData(initData: string): Promise<Record<string, unknown>> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("hash missing");
  params.delete("hash");

  const checkStr = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const baseKey = await crypto.subtle.importKey("raw", enc.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secretBytes = await crypto.subtle.sign("HMAC", baseKey, enc.encode(BOT_TOKEN));
  const hmacKey = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", hmacKey, hexToBytes(hash), enc.encode(checkStr));
  if (!valid) throw new Error("Invalid init data");

  const userJson = params.get("user");
  if (!userJson) throw new Error("user missing in initData");
  return JSON.parse(userJson);
}

async function upsertUser(admin: ReturnType<typeof createClient>, tgUser: {
  telegramId: string; fullName: string; photoUrl: string | null; username: string | null;
}) {
  const { telegramId, fullName, photoUrl, username } = tgUser;
  const virtualEmail = `tg_${telegramId}@tg.hammabop.uz`;

  const { data: existingRow } = await admin
    .from("users")
    .select("id")
    .eq("telegram_id", Number(telegramId))
    .maybeSingle();

  let authUserId: string;
  let authKey: string;

  if (existingRow) {
    const { data: { user: au } } = await admin.auth.admin.getUserById(existingRow.id);
    if (!au) throw new Error("Auth user not found");
    authKey = au.user_metadata?.telegram_auth_key as string;
    authUserId = au.id;
    await admin.from("users").update({
      full_name: fullName,
      avatar_url: photoUrl,
      username,
      last_active: new Date().toISOString(),
    }).eq("id", authUserId);
  } else {
    authKey = crypto.randomUUID();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: virtualEmail,
      password: authKey,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        telegram_username: username,
        telegram_auth_key: authKey,
        full_name: fullName,
        avatar_url: photoUrl,
      },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Create user failed");
    authUserId = created.user.id;

    await admin.from("users").upsert({
      id: authUserId,
      google_id: authUserId,
      telegram_id: Number(telegramId),
      full_name: fullName,
      email: virtualEmail,
      avatar_url: photoUrl,
      username,
      last_active: new Date().toISOString(),
    });
  }

  return { authUserId, authKey, virtualEmail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let telegramId: string;
    let fullName: string;
    let photoUrl: string | null;
    let username: string | null;

    if (body.widget_data) {
      // Telegram Login Widget
      const d = await verifyWidgetData(body.widget_data);
      telegramId = String(d.id);
      fullName = [d.first_name, d.last_name].filter(Boolean).join(" ");
      photoUrl = (d.photo_url as string) ?? null;
      username = (d.username as string) ?? null;
    } else if (body.init_data) {
      // Telegram Mini App
      const d = await verifyInitData(body.init_data);
      telegramId = String(d.id);
      fullName = [d.first_name, d.last_name].filter(Boolean).join(" ");
      photoUrl = (d.photo_url as string) ?? null;
      username = (d.username as string) ?? null;
    } else {
      throw new Error("widget_data yoki init_data talab qilinadi");
    }

    const { authUserId, authKey, virtualEmail } = await upsertUser(admin, { telegramId, fullName, photoUrl, username });

    const regular = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInErr } = await regular.auth.signInWithPassword({
      email: virtualEmail,
      password: authKey,
    });
    if (signInErr || !signIn.session) throw new Error(signInErr?.message ?? "Sign in failed");

    return new Response(
      JSON.stringify({
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        user: { id: authUserId, telegram_id: telegramId, full_name: fullName },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[telegram-auth]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
