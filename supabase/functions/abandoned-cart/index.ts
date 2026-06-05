/**
 * abandoned-cart — Tashlab ketilgan savat eslatmasi
 * Supabase Cron: har soatda bir marta
 * pg_cron SQL: SELECT cron.schedule('abandoned-cart','0 * * * *',
 *   $$SELECT net.http_post('{FUNCTION_URL}/abandoned-cart',
 *     headers:='{"Authorization":"Bearer {ANON_KEY}"}'::jsonb)$$);
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN       = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function tgSend(chatId: number, text: string, keyboard?: unknown) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: keyboard,
    }),
  });
}

serve(async (req) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // 2 soatdan oshgan, hali eslatilmagan, 2+ mahsulotli savatlar
    const { data: snapshots } = await db
      .from("cart_snapshots")
      .select("id, user_id, telegram_id, cart_data, item_count, updated_at")
      .lt("updated_at", twoHoursAgo)
      .is("alerted_at", null)
      .gte("item_count", 2);

    if (!snapshots?.length) {
      return new Response(JSON.stringify({ ok: true, alerted: 0 }));
    }

    let alerted = 0;

    for (const snap of snapshots) {
      // Telegram ID ni olish
      let chatId: number | null = snap.telegram_id ?? null;
      if (!chatId && snap.user_id) {
        const { data: user } = await db
          .from("users")
          .select("telegram_id")
          .eq("id", snap.user_id)
          .maybeSingle();
        chatId = user?.telegram_id ?? null;
      }

      if (!chatId) continue;

      // Savatdagi mahsulotlar ro'yxati
      const items = (snap.cart_data as Array<{ name?: string; quantity?: number; price?: number }>) ?? [];
      const itemLines = items.slice(0, 3).map(
        (it) => `  • ${it.name ?? "Mahsulot"} x${it.quantity ?? 1}`,
      ).join("\n");

      const text = [
        `🛒 <b>Savatchangizda mahsulotlar siz bilan!!</b>`,
        ``,
        itemLines,
        items.length > 3 ? `  ... va yana ${items.length - 3} ta` : "",
        ``,
        `⚡ Hozir sotib olsangiz, <b>kuryer bugun yo'lga chiqadi!</b>`,
        `🎁 Omadli xaridor bo'ling — chegirmalar cheklangan.`,
      ].filter(Boolean).join("\n");

      await tgSend(chatId, text, {
        inline_keyboard: [[
          { text: "🛒 Savatga o'tish", web_app: { url: "https://aigate.uz/cart" } },
        ]],
      });

      // alerted_at ni yangilash
      await db.from("cart_snapshots")
        .update({ alerted_at: new Date().toISOString() })
        .eq("id", snap.id);

      alerted++;
    }

    return new Response(JSON.stringify({ ok: true, alerted }));
  } catch (e) {
    console.error("[abandoned-cart]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
