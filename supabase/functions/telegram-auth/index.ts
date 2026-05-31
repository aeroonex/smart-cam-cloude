import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

/** Telegram hash tekshiruvi */
async function verifyTelegramHash(data: Record<string, string>): Promise<boolean> {
  const { hash, ...rest } = data;
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v != null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.digest("SHA-256", encoder.encode(TELEGRAM_BOT_TOKEN));
  const hmacKey = await crypto.subtle.importKey(
    "raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(dataCheckString));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === hash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const tgData: Record<string, string> = await req.json();

    // 1. Hash tekshiruvi
    const valid = await verifyTelegramHash(tgData);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid Telegram signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. auth_date eskirmaganini tekshirish (24 soat)
    if (Date.now() / 1000 - Number(tgData.auth_date) > 86400) {
      return new Response(JSON.stringify({ error: "Auth data expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telegramId = String(tgData.id);
    const fullName = [tgData.first_name, tgData.last_name].filter(Boolean).join(" ");
    const photoUrl = tgData.photo_url ?? null;
    const virtualEmail = `tg_${telegramId}@tg.hammabop.uz`;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Mavjud foydalanuvchini telegram_id bo'yicha qidirish
    const { data: existingRow } = await admin
      .from("users")
      .select("id")
      .eq("telegram_id", Number(telegramId))
      .maybeSingle();

    let authUserId: string;
    let authKey: string;

    if (existingRow) {
      // Auth userdan saqlangan kalit olish
      const { data: { user: au } } = await admin.auth.admin.getUserById(existingRow.id);
      if (!au) throw new Error("Auth user not found");
      authKey = au.user_metadata?.telegram_auth_key as string;
      authUserId = au.id;

      // Ma'lumotlarni yangilash
      await admin.from("users").update({ full_name: fullName, avatar_url: photoUrl })
        .eq("id", authUserId);
    } else {
      // Yangi foydalanuvchi yaratish
      authKey = crypto.randomUUID();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: virtualEmail,
        password: authKey,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          telegram_auth_key: authKey,
          full_name: fullName,
          avatar_url: photoUrl,
        },
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? "Create user failed");
      authUserId = created.user.id;

      // public.users jadvaliga yozish
      await admin.from("users").upsert({
        id: authUserId,
        google_id: authUserId,
        telegram_id: Number(telegramId),
        full_name: fullName,
        email: virtualEmail,
        avatar_url: photoUrl,
      });
    }

    // 4. Parol bilan oddiy sessiya ochish (to'liq access + refresh token olish uchun)
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
        user: { id: authUserId, telegram_id: telegramId, full_name: fullName, avatar_url: photoUrl },
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
