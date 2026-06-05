/**
 * generate-invoice — PDF chek generatsiya va Telegramga jo'natish
 * Trigger: POST /functions/v1/generate-invoice  { order_id: string }
 * Ichki Supabase webhook orqali ham chaqirilishi mumkin.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const APP_URL          = Deno.env.get("APP_URL") ?? "https://aigate.uz";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

function formatPrice(n: number) {
  return n.toLocaleString("ru-RU") + " so'm";
}

/** Minimalist PDF generator — raw PDF syntax (no deps) */
function buildPdf(order: Record<string, unknown>): Uint8Array {
  const items = (order.items as Array<{ product_name?: string; quantity?: number; price?: number }>) ?? [];
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const date = new Date(String(order.created_at)).toLocaleDateString("ru-RU");
  const total = formatPrice(Number(order.total_amount ?? 0));
  const payMethod = order.payment_method === "nasiya" ? "Nasiya" : "Naqd / Click / Payme";

  const lineH = 20;
  let y = 750;
  const lines: string[] = [];

  function addLine(text: string, size = 11, bold = false) {
    lines.push(`BT /F${bold ? "2" : "1"} ${size} Tf ${50} ${y} Td (${esc(text)}) Tj ET`);
    y -= lineH;
  }
  function addHr() {
    lines.push(`${50} ${y + 8} m ${545} ${y + 8} l S`);
    y -= 10;
  }

  // Header
  addLine("HammaBop — Elektron Chek", 18, true);
  addLine(`hammabop.uz`, 10);
  addHr();
  addLine(`Buyurtma: #${shortId}`, 12, true);
  addLine(`Sana: ${date}`, 11);
  addLine(`Mijoz: ${order.customer_name ?? "—"}`, 11);
  addLine(`Manzil: ${order.customer_region ?? "—"}`, 11);
  addLine(`To'lov turi: ${payMethod}`, 11);
  addHr();
  addLine("Mahsulotlar:", 12, true);
  for (const item of items) {
    const row = `  ${item.product_name ?? "?"} x${item.quantity ?? 1} = ${formatPrice((item.price ?? 0) * (item.quantity ?? 1))}`;
    addLine(row, 10);
  }
  addHr();
  addLine(`JAMI: ${total}`, 14, true);
  addHr();
  addLine(`Kuzatish: ${APP_URL}/track?id=${order.tracking_token}`, 10);
  addLine("Xarid uchun rahmat! HammaBop sizni hurmat qiladi.", 10);

  const streamContent = lines.join("\n");
  const stream = encode(streamContent);

  const pdfBody = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]`,
    `/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>`,
    `/F2<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>>>>>>>>endobj`,
    `4 0 obj<</Length ${stream.length}>>`,
    "stream",
    streamContent,
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f \r",
    "trailer<</Size 5/Root 1 0 R>>",
    "startxref",
    "9",
    "%%EOF",
  ].join("\n");

  return encode(pdfBody);
}

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function esc(s: string) {
  return s.replace(/[\(\)\\]/g, "\\$&");
}

async function sendTelegramDocument(chatId: number, pdf: Uint8Array, caption: string, orderId: string, trackToken: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  const blob = new Blob([pdf], { type: "application/pdf" });
  form.append("document", blob, `chek_${orderId.slice(0, 8).toUpperCase()}.pdf`);

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: form,
  });

  // Kuzatish havolasi bilan alohida xabar
  const trackMsg = `📍 <b>Buyurtmangizni kuzatish:</b>\n${APP_URL}/track?id=${trackToken}`;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: trackMsg,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "📦 Buyurtmani kuzatish", url: `${APP_URL}/track?id=${trackToken}` },
        ]],
      },
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400 });

    // Buyurtmani olish
    const { data: order, error: oErr } = await db
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();

    if (oErr || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });

    // PDF yaratish
    const pdf = buildPdf(order);

    // Telegram chat ID olish (user_id orqali)
    let chatId: number | null = null;
    if (order.user_id) {
      const { data: user } = await db
        .from("users")
        .select("telegram_id")
        .eq("id", order.user_id)
        .maybeSingle();
      chatId = user?.telegram_id ?? null;
    }

    if (chatId) {
      const shortId = String(order.id).slice(0, 8).toUpperCase();
      const caption = [
        `🧾 <b>HammaBop — Siz uchun elektron chek!</b>`,
        ``,
        `📦 Buyurtma: <b>#${shortId}</b>`,
        `💵 Jami: <b>${formatPrice(Number(order.total_amount ?? 0))}</b>`,
        `📅 Sana: ${new Date(String(order.created_at)).toLocaleDateString("ru-RU")}`,
        ``,
        `✅ Buyurtmangiz yo'lga chiqdi!`,
      ].join("\n");

      await sendTelegramDocument(chatId, pdf, caption, String(order.id), String(order.tracking_token));
    }

    // Invoice URL ni bazaga saqlaymiz (Storage ga yuklash)
    const fileName = `invoices/${order.id}.pdf`;
    const { error: upErr } = await db.storage
      .from("documents")
      .upload(fileName, pdf, { contentType: "application/pdf", upsert: true });

    if (!upErr) {
      const { data: urlData } = db.storage.from("documents").getPublicUrl(fileName);
      await db.from("orders").update({ invoice_url: urlData.publicUrl }).eq("id", order.id);
    }

    return new Response(JSON.stringify({ ok: true, sent_to: chatId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-invoice]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
