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

const ADMIN_TELEGRAM_IDS = new Set([5064451675]);

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  return telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
  });
}

function parseStartPayload(text: string) {
  const parts = text.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function isAdminTelegram(telegramId: number) {
  return ADMIN_TELEGRAM_IDS.has(telegramId);
}

function renderOrder(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map(
          (item) =>
            `• ${item.product_name ?? "Mahsulot"} × ${item.quantity ?? 0} — ${formatPrice(
              Number(item.price ?? 0) * Number(item.quantity ?? 0),
            )}`,
        )
        .join("\n")
    : "• Mahsulotlar topilmadi";

  const statusMap: Record<string, string> = {
    yangi: "🆕 Yangi",
    yetkazilmoqda: "🚚 Yetkazilmoqda",
    yopildi: "✅ Yopildi",
    rad_etildi: "❌ Rad etildi",
  };

  return [
    `Buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
    `Holat: ${statusMap[order.status] ?? order.status}`,
    `Sana: ${new Date(order.created_at).toLocaleString("uz-UZ")}`,
    `Mijoz: ${order.customer_name ?? "—"}`,
    `Hudud: ${order.customer_region ?? "—"}`,
    "",
    "Mahsulotlar:",
    itemsText,
    "",
    `Jami: ${formatPrice(Number(order.total_amount ?? 0))}`,
  ].join("\n");
}

function renderUserPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋`,
    "",
    "Siz uchun foydalanuvchi paneli tayyor.",
    "",
    "Buyruqlar:",
    "• /orders — so'nggi buyurtmalaringiz",
    "• /start order_<id> — muayyan buyurtmani ko'rish",
    "",
    "Agar akkaunt hali ulanmagan bo'lsa, saytdagi ‘Telegram ulash’ tugmasini bosing.",
  ].join("\n");
}

function renderAdminPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋`,
    "",
    "Admin panel ochildi.",
    "",
    "Admin buyruqlar:",
    "• /admin_stats — umumiy statistika",
    "• /admin_orders — oxirgi buyurtmalar",
    "• /orders — agar akkaunt ulangan bo'lsa, shaxsiy buyurtmalar",
    "• /start order_<id> — istalgan buyurtmani ko'rish",
  ].join("\n");
}

async function renderRecentOrders(adminClient: ReturnType<typeof createClient>, userId?: string) {
  let query = adminClient
    .from("orders")
    .select("id,total_amount,status,created_at,customer_name,customer_region")
    .order("created_at", { ascending: false })
    .limit(8);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    return "📦 Hozircha buyurtmalar topilmadi.";
  }

  const statusMap: Record<string, string> = {
    yangi: "🆕",
    yetkazilmoqda: "🚚",
    yopildi: "✅",
    rad_etildi: "❌",
  };

  return [
    userId ? "So'nggi buyurtmalaringiz:" : "Oxirgi buyurtmalar:",
    "",
    ...data.map((order) => {
      const icon = statusMap[order.status] ?? "•";
      return `${icon} #${order.id.slice(0, 8).toUpperCase()} — ${formatPrice(Number(order.total_amount ?? 0))} — ${order.customer_name ?? "Mijoz"} ${order.customer_region ? `(${order.customer_region})` : ""}`;
    }),
  ].join("\n");
}

async function renderAdminStats(adminClient: ReturnType<typeof createClient>) {
  const [usersResult, productsResult, ordersResult, newOrdersResult] = await Promise.all([
    adminClient.from("users").select("id", { count: "exact", head: true }),
    adminClient.from("products").select("id", { count: "exact", head: true }),
    adminClient.from("orders").select("id", { count: "exact", head: true }),
    adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "yangi"),
  ]);

  if (usersResult.error || productsResult.error || ordersResult.error || newOrdersResult.error) {
    throw new Error(
      usersResult.error?.message ||
        productsResult.error?.message ||
        ordersResult.error?.message ||
        newOrdersResult.error?.message ||
        "Statistika olinmadi",
    );
  }

  return [
    "SmartCam Admin Statistikasi",
    "",
    `• Foydalanuvchilar: ${usersResult.count ?? 0}`,
    `• Mahsulotlar: ${productsResult.count ?? 0}`,
    `• Jami buyurtmalar: ${ordersResult.count ?? 0}`,
    `• Yangi buyurtmalar: ${newOrdersResult.count ?? 0}`,
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
    const telegramId = Number(message.from?.id ?? chatId);
    const adminMode = isAdminTelegram(telegramId);

    await adminClient.from("telegram_sessions").upsert({
      telegram_id: telegramId,
      state: adminMode ? "admin" : "idle",
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
            const updatePayload: Record<string, unknown> = { telegram_id: telegramId };

            if (adminMode) {
              updatePayload.role = "admin";
            }

            const { data: linkedUser, error: userError } = await adminClient
              .from("users")
              .update(updatePayload)
              .eq("id", userId)
              .select("full_name, role")
              .single();

            if (userError || !linkedUser) {
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
                adminMode
                  ? `✅ ${linkedUser.full_name || "Hisob"} admin sifatida ulandi.\n\n${renderAdminPanel(message.from?.first_name)}`
                  : `✅ ${linkedUser.full_name || "Hisob"} Telegram bilan muvaffaqiyatli ulandi.\n\n${renderUserPanel(message.from?.first_name)}`,
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

        if (!orderId) {
          await sendTelegramMessage(botToken, chatId, "❌ Buyurtma havolasi noto'g'ri.");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (adminMode) {
          const { data: order, error: orderError } = await adminClient
            .from("orders")
            .select("id,total_amount,status,customer_name,customer_region,created_at,items")
            .eq("id", orderId)
            .maybeSingle();

          if (orderError || !order) {
            console.error("[telegram-bot] admin order lookup failed", {
              orderId,
              telegramId,
              orderError: orderError?.message,
            });
            await sendTelegramMessage(botToken, chatId, "❌ Buyurtma topilmadi.");
          } else {
            await sendTelegramMessage(botToken, chatId, renderOrder(order as OrderRow));
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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

        const { data: order, error: orderError } = await adminClient
          .from("orders")
          .select("id,total_amount,status,customer_name,customer_region,created_at,items")
          .eq("id", orderId)
          .eq("user_id", linkedUser.id)
          .maybeSingle();

        if (orderError || !order) {
          console.error("[telegram-bot] user order lookup failed", {
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
        adminMode ? renderAdminPanel(message.from?.first_name) : renderUserPanel(message.from?.first_name),
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/admin" || text === "/admin_stats") {
      if (!adminMode) {
        await sendTelegramMessage(botToken, chatId, "⛔ Siz admin emassiz.");
      } else if (text === "/admin") {
        await sendTelegramMessage(botToken, chatId, renderAdminPanel(message.from?.first_name));
      } else {
        const statsText = await renderAdminStats(adminClient);
        await sendTelegramMessage(botToken, chatId, statsText);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/admin_orders") {
      if (!adminMode) {
        await sendTelegramMessage(botToken, chatId, "⛔ Siz admin emassiz.");
      } else {
        const ordersText = await renderRecentOrders(adminClient);
        await sendTelegramMessage(botToken, chatId, ordersText);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/orders") {
      if (adminMode) {
        const ordersText = await renderRecentOrders(adminClient);
        await sendTelegramMessage(botToken, chatId, ordersText);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      const ordersText = await renderRecentOrders(adminClient, linkedUser.id);
      await sendTelegramMessage(botToken, chatId, ordersText);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendTelegramMessage(
      botToken,
      chatId,
      adminMode
        ? "ℹ️ Admin buyruqlar: /admin, /admin_stats, /admin_orders, /orders"
        : "ℹ️ Buyruqlar: /orders yoki saytdan buyurtma tracking havolasini oching.",
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram-bot] unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
