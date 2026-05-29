import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import {
  decodeOrderToken,
  formatPrice,
  telegramRequest,
  verifyLinkPayload,
} from "../_shared/telegram.ts";

type TelegramMessage = {
  chat?: { id?: number };
  text?: string;
  from?: { id?: number; first_name?: string };
};

type OrderRow = {
  id: string;
  total_amount: number;
  status: string;
  customer_name: string | null;
  customer_region: string | null;
  created_at: string;
  items: Array<{
    product_name?: string;
    quantity?: number;
    price?: number;
  }> | null;
};

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  return telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}

function parseStartPayload(text: string) {
  const parts = text.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function renderOrder(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map((item) => `• ${item.product_name ?? "Mahsulot"} × ${item.quantity ?? 0} — ${formatPrice(Number(item.price ?? 0) * Number(item.quantity ?? 0))}`)
        .join("\n")
    : "• Mahsulotlar topilmadi";

  const statusMap: Record<string, string> = {
    yangi: "🆕 Yangi",
    yetkazilmoqda: "🚚 Yetkazilmoqda",
    yopildi: "✅ Yopildi",
    rad_etildi: "❌ Rad etildi",
  };

  return [
    `<b>Buyurtma #${order.id.slice(0, 8).toUpperCase()}</b>`,
    `Holat: ${statusMap[order.status] ?? order.status}`,
    `Sana: ${new Date(order.created_at).toLocaleString("uz-UZ")}`,
    `Mijoz: ${order.customer_name ?? "—"}`,
    `Hudud: ${order.customer_region ?? "—"}`,
    "",
    "<b>Mahsulotlar:</b>",
    itemsText,
    "",
    `<b>Jami:</b> ${formatPrice(Number(order.total_amount ?? 0))}`,
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[telegram-bot] health check request");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("[telegram-bot] missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const payload = await req.json();
    const message = (payload.message ?? payload.edited_message) as TelegramMessage | undefined;

    if (!message?.chat?.id || !message.text) {
      console.log("[telegram-bot] ignored unsupported update");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = Number(message.chat.id);
    const text = message.text.trim();
    const telegramId = message.from?.id ?? chatId;

    await adminClient.from("telegram_sessions").upsert({
      telegram_id: telegramId,
      state: "idle",
      temp_data: { last_text: text },
    });

    if (text.startsWith("/start")) {
      const startPayload = parseStartPayload(text);

      if (startPayload.startsWith("link_")) {
        const [, compactUserId, timestamp, signature] = startPayload.split("_");

        if (!compactUserId || !timestamp || !signature) {
          await sendTelegramMessage(botToken, chatId, "❌ Link noto'g'ri yoki eskirgan.");
        } else {
          const isValid = await verifyLinkPayload({
            botToken,
            compactUserId,
            timestamp,
            signature,
          });

          if (!isValid) {
            await sendTelegramMessage(botToken, chatId, "❌ Link eskirgan yoki noto'g'ri. Saytdan qayta ulab ko'ring.");
          } else {
            const userId = `${compactUserId.slice(0, 8)}-${compactUserId.slice(8, 12)}-${compactUserId.slice(12, 16)}-${compactUserId.slice(16, 20)}-${compactUserId.slice(20)}`;
            const { data: user, error: userError } = await adminClient
              .from("users")
              .update({ telegram_id: telegramId })
              .eq("id", userId)
              .select("full_name")
              .single();

            if (userError || !user) {
              console.error("[telegram-bot] failed to link telegram account", {
                userId,
                telegramId,
                userError: userError?.message,
              });
              await sendTelegramMessage(botToken, chatId, "❌ Hisobni ulashda xato yuz berdi.");
            } else {
              await sendTelegramMessage(
                botToken,
                chatId,
                `✅ ${user.full_name || "Hisob"} Telegram bilan muvaffaqiyatli ulandi.\n\nBuyurtmalar uchun /orders yuboring.`,
              );
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (startPayload.startsWith("order_")) {
        const orderId = decodeOrderToken(startPayload.replace("order_", ""));
        const { data: linkedUser } = await adminClient
          .from("users")
          .select("id")
          .eq("telegram_id", telegramId)
          .maybeSingle();

        if (!linkedUser) {
          await sendTelegramMessage(
            botToken,
            chatId,
            "🔗 Avval saytdagi profilingiz orqali Telegram hisobingizni ulang, keyin order tracking ishlaydi.",
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!orderId) {
          await sendTelegramMessage(botToken, chatId, "❌ Buyurtma havolasi noto'g'ri.");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: order, error: orderError } = await adminClient
          .from("orders")
          .select("id,total_amount,status,customer_name,customer_region,created_at,items")
          .eq("id", orderId)
          .eq("user_id", linkedUser.id)
          .maybeSingle();

        if (orderError || !order) {
          console.error("[telegram-bot] order not accessible for telegram user", {
            orderId,
            telegramId,
            orderError: orderError?.message,
          });
          await sendTelegramMessage(botToken, chatId, "❌ Bu buyurtma topilmadi yoki sizga tegishli emas.");
        } else {
          await sendTelegramMessage(botToken, chatId, renderOrder(order as OrderRow));
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        `Salom${message.from?.first_name ? `, ${message.from.first_name}` : ""}! 👋\n\nBu SmartCam boti.\n\n• /orders — so'nggi buyurtmalaringiz\n• /start order_<id> — muayyan buyurtma tracking\n\nAgar hali ulanmagan bo'lsangiz, saytdan Telegram hisobingizni ulang.`,
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/orders") {
      const { data: linkedUser } = await adminClient
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (!linkedUser) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "🔗 Buyurtmalarni ko'rish uchun avval saytdagi profilingiz orqali Telegram hisobingizni ulang.",
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: orders, error: ordersError } = await adminClient
        .from("orders")
        .select("id,total_amount,status,created_at")
        .eq("user_id", linkedUser.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (ordersError) {
        console.error("[telegram-bot] failed to fetch orders", {
          telegramId,
          ordersError: ordersError.message,
        });
        await sendTelegramMessage(botToken, chatId, "❌ Buyurtmalarni olishda xato yuz berdi.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!orders?.length) {
        await sendTelegramMessage(botToken, chatId, "📦 Hozircha buyurtmalaringiz topilmadi.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusMap: Record<string, string> = {
        yangi: "🆕",
        yetkazilmoqda: "🚚",
        yopildi: "✅",
        rad_etildi: "❌",
      };

      const listText = orders
        .map((order) => {
          const icon = statusMap[order.status] ?? "•";
          return `${icon} #${order.id.slice(0, 8).toUpperCase()} — ${formatPrice(Number(order.total_amount ?? 0))}`;
        })
        .join("\n");

      await sendTelegramMessage(botToken, chatId, `<b>So'nggi buyurtmalar:</b>\n${listText}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendTelegramMessage(
      botToken,
      chatId,
      "ℹ️ Buyruqlar: /orders yoki saytdan buyurtma tracking havolasini oching.",
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram-bot] unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
