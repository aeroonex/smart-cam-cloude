/**
 * notifications — Markaziy bildirishnoma handler
 *
 * POST /functions/v1/notifications
 * Body: { type: "low_stock" | "partner_order" | "nasiya_reject", payload: {...} }
 *
 * Bu funksiya Supabase Database Webhooks orqali chaqiriladi.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_IDS        = (Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "5064451675")
  .split(",").map((id) => Number(id.trim()));
const APP_URL          = Deno.env.get("APP_URL") ?? "https://aigate.uz";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function tgSend(chatId: number | string, text: string, keyboard?: unknown) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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

// ─── 9. Low Stock Alert ───────────────────────────────────────────────────────
async function handleLowStock(payload: {
  product_id: string;
  name: string;
  stock_count: number;
  category: string;
  store_name?: string;
}) {
  const text = [
    `⚠️ <b>DIQQAT! Tovar tugamoqda</b>`,
    ``,
    `📦 Mahsulot: <b>${payload.name}</b>`,
    payload.store_name ? `🏪 Do'kon: ${payload.store_name}` : null,
    `🗂 Kategoriya: ${payload.category ?? "—"}`,
    `📊 Qoldiq: <b>${payload.stock_count} dona</b>`,
    ``,
    `👆 Admin paneldan to'ldiring: ${APP_URL}/admin`,
  ].filter(Boolean).join("\n");

  for (const adminId of ADMIN_IDS) {
    await tgSend(adminId, text);
  }
}

// ─── 8. Partner Store Order Notification ─────────────────────────────────────
async function handlePartnerOrder(order: {
  id: string;
  store_id?: string;
  store_name?: string;
  items: Array<{ product_name?: string; quantity?: number }>;
  customer_region?: string;
  total_amount: number;
}) {
  if (!order.store_id) return;

  // Do'konning Telegram guruhini olish
  const { data: storeGroup } = await db
    .from("store_telegram_groups")
    .select("group_chat_id, store_name")
    .eq("store_id", order.store_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!storeGroup) return;

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const itemList = (order.items ?? [])
    .map((it) => `  • ${it.product_name ?? "?"} x${it.quantity ?? 1}`)
    .join("\n");

  const text = [
    `🛍 <b>YANGI BUYURTMA!</b>`,
    ``,
    `📦 Buyurtma: <b>#${shortId}</b>`,
    ``,
    `🛒 Mahsulotlar:`,
    itemList,
    ``,
    `📍 Yetkazish: ${order.customer_region ?? "—"}`,
    `💵 Jami: ${Number(order.total_amount).toLocaleString("ru-RU")} so'm`,
    ``,
    `🚚 Kuryer soat 14:00 da olib ketishga boradi.`,
  ].join("\n");

  await tgSend(storeGroup.group_chat_id, text);
}

// ─── 6. Nasiya Reject Handler ─────────────────────────────────────────────────
async function handleNasiyaReject(data: {
  order_id: string;
  user_id?: string;
  provider: string; // 'alif' | 'uzum'
}) {
  // Buyurtmani "nasiya_rejected" qilib belgilash
  await db.from("orders")
    .update({ nasiya_status: "rejected" })
    .eq("id", data.order_id);

  // Foydalanuvchi telegram_id
  if (!data.user_id) return;
  const { data: user } = await db
    .from("users")
    .select("telegram_id")
    .eq("id", data.user_id)
    .maybeSingle();

  if (!user?.telegram_id) return;

  const shortId = String(data.order_id).slice(0, 8).toUpperCase();
  const text = [
    `⚠️ <b>Nasiya buyurtmangiz tasdiqlanmadi</b>`,
    ``,
    `📦 Buyurtma: #${shortId}`,
    `🏦 Nasiya tizimi (${data.provider === "alif" ? "Alif Nasiya" : "Uzum Nasiya"}): <b>Rad etildi</b>`,
    ``,
    `💡 Xaridni davom ettirish uchun muqobil to'lov usullaridan birini tanlang:`,
  ].join("\n");

  await tgSend(user.telegram_id, text, {
    inline_keyboard: [
      [
        { text: "💳 Click orqali to'lash",  callback_data: `pay_click:${data.order_id}` },
        { text: "💳 Payme orqali to'lash", callback_data: `pay_payme:${data.order_id}` },
      ],
      [
        { text: "💵 Kuryerga naqd to'lash", callback_data: `pay_cash:${data.order_id}` },
        { text: "❌ Bekor qilish",          callback_data: `cancel:${data.order_id}` },
      ],
    ],
  });
}

// ─── Webhook: Order paid → PDF invoice ───────────────────────────────────────
async function handleOrderPaid(orderId: string) {
  const { data: order } = await db.from("orders")
    .select("payment_status, nasiya_status")
    .eq("id", orderId)
    .maybeSingle();

  if (order?.payment_status !== "paid") return;

  // generate-invoice funksiyasini chaqirish
  await fetch(`${SUPABASE_URL}/functions/v1/generate-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE}`,
    },
    body: JSON.stringify({ order_id: orderId }),
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type, payload } = body as { type: string; payload: Record<string, unknown> };

    switch (type) {
      case "low_stock":
        await handleLowStock(payload as Parameters<typeof handleLowStock>[0]);
        break;

      case "partner_order":
        await handlePartnerOrder(payload as Parameters<typeof handlePartnerOrder>[0]);
        break;

      case "nasiya_reject":
        await handleNasiyaReject(payload as Parameters<typeof handleNasiyaReject>[0]);
        break;

      case "order_paid":
        await handleOrderPaid(String(payload.order_id));
        break;

      // Supabase Database Webhook (orders UPDATE)
      case "db_webhook": {
        const record = payload.record as Record<string, unknown>;
        const old    = payload.old_record as Record<string, unknown> | undefined;

        // Buyurtma to'landi → PDF chek
        if (record.payment_status === "paid" && old?.payment_status !== "paid") {
          await handleOrderPaid(String(record.id));
        }

        // Yangi buyurtma → hamkor do'konga xabar
        if (!old && record.store_id) {
          await handlePartnerOrder(record as Parameters<typeof handlePartnerOrder>[0]);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notifications]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
