/**
 * courier-bot — Kuryerlar uchun maxsus Telegram interfeys
 *
 * Webhook: https://{supabase}/functions/v1/courier-bot
 * Telegram bot tokenini COURIER_BOT_TOKEN env'da saqlash kerak.
 * Agar bitta bot bo'lsa, TELEGRAM_BOT_TOKEN ishlatsa ham bo'ladi.
 *
 * Callback patterns:
 *   delivered:{orderId}  — kuryer yetkazildi tugmasini bosdi
 *   assign:{orderId}:{courierTgId} — admin kuryer tayinladi
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const APP_URL          = Deno.env.get("APP_URL") ?? "https://aigate.uz";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function tgCall(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

/** Admin paneldan kuryerga buyurtma jo'natish */
export async function assignOrderToCourier(orderId: string, courierTgId: number, courierName: string) {
  // 1. courier_assignments ga yozish
  await db.from("courier_assignments").upsert({
    order_id: orderId,
    courier_telegram_id: courierTgId,
    courier_name: courierName,
    assigned_at: new Date().toISOString(),
  }, { onConflict: "order_id" });

  // 2. Buyurtma ma'lumotlarini olish
  const { data: order } = await db
    .from("orders")
    .select("id, customer_name, customer_phone, customer_region, address_detail, total_amount, items")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const text = [
    `🚚 <b>Yangi yetkazish topshirig'i!</b>`,
    ``,
    `📦 Buyurtma: <b>#${shortId}</b>`,
    `👤 Mijoz: ${order.customer_name ?? "—"}`,
    `📞 Telefon: <code>${order.customer_phone ?? "—"}</code>`,
    `📍 Manzil: ${order.customer_region ?? "—"}`,
    order.address_detail ? `🏠 Batafsil: ${order.address_detail}` : null,
    `💵 Jami: ${Number(order.total_amount ?? 0).toLocaleString("ru-RU")} so'm`,
    ``,
    `✅ Yetkazib bo'lgach "Yetkazdim" tugmasini bosing.`,
  ].filter(Boolean).join("\n");

  await tgCall("sendMessage", {
    chat_id: courierTgId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Yetkazdim!", callback_data: `delivered:${orderId}` },
        { text: "📞 Mijozga qo'ng'iroq", url: `tel:${order.customer_phone ?? ""}` },
      ]],
    },
  });
}

serve(async (req) => {
  try {
    const body = await req.json();

    // Callback query — kuryer tugma bosdi
    if (body.callback_query) {
      const { id: cbId, from, data } = body.callback_query;

      if (data?.startsWith("delivered:")) {
        const orderId = data.replace("delivered:", "");
        const courierTgId = from.id;

        // 1. Buyurtma statusini yangilash
        const { error } = await db.from("orders").update({
          status: "mijoz_qabul_qildi",
        }).eq("id", orderId);

        if (error) {
          await tgCall("answerCallbackQuery", { callback_query_id: cbId, text: "Xato yuz berdi!" });
          return new Response("ok");
        }

        // 2. courier_assignments da delivered_at
        await db.from("courier_assignments").update({
          delivered_at: new Date().toISOString(),
        }).eq("order_id", orderId).eq("courier_telegram_id", courierTgId);

        // 3. Kuryerga tasdiqlash
        await tgCall("answerCallbackQuery", {
          callback_query_id: cbId,
          text: "✅ Yetkazildi! Raxmat.",
          show_alert: true,
        });

        // 4. Xabarni yangilash
        const shortId = orderId.slice(0, 8).toUpperCase();
        await tgCall("editMessageText", {
          chat_id: from.id,
          message_id: body.callback_query.message.message_id,
          text: `✅ <b>Buyurtma #${shortId} muvaffaqiyatli yetkazildi!</b>\n\nRaxmat! Yaxshi ish.`,
          parse_mode: "HTML",
        });

        // 5. Mijozga Telegram xabar
        const { data: order } = await db
          .from("orders")
          .select("user_id, tracking_token")
          .eq("id", orderId)
          .maybeSingle();

        if (order?.user_id) {
          const { data: user } = await db
            .from("users")
            .select("telegram_id")
            .eq("id", order.user_id)
            .maybeSingle();

          if (user?.telegram_id) {
            await tgCall("sendMessage", {
              chat_id: user.telegram_id,
              text: [
                `🎉 <b>Buyurtmangiz yetkazildi!</b>`,
                ``,
                `Buyurtma #${shortId} muvaffaqiyatli topshirildi.`,
                `Xarid uchun rahmat! 🙏`,
                ``,
                `📦 Kuzatish: ${APP_URL}/track?id=${order.tracking_token}`,
              ].join("\n"),
              parse_mode: "HTML",
            });
          }
        }
      }
    }

    // Admin POST: kuryerga tayinlash
    if (req.method === "POST" && body.action === "assign") {
      const { order_id, courier_telegram_id, courier_name } = body;
      await assignOrderToCourier(order_id, courier_telegram_id, courier_name ?? "Kuryer");
      return new Response(JSON.stringify({ ok: true }));
    }

    return new Response("ok");
  } catch (e) {
    console.error("[courier-bot]", e);
    return new Response("error", { status: 500 });
  }
});
