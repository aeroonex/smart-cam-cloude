import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { HOOK_SECRET, type OrderEventPayload } from "../_shared/order-events.ts";
import {
  buildPaymentPromptKeyboard,
  buildStatusKeyboard,
  buildUserOrderKeyboard,
  needsPayment,
  prepareReceiptSession,
  renderOrder,
  renderPaymentInstructions,
  renderStatusChangedMessage,
  resolveAdminChatIds,
} from "../_shared/smartcam-bot.ts";
import { telegramRequest } from "../_shared/telegram.ts";

async function sendMessage(token: string, chatId: number, text: string, replyMarkup?: Record<string, unknown>) {
  try {
    return await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  } catch (error) {
    if (replyMarkup) {
      console.error("[telegram-events] sendMessage with keyboard failed, retrying plain text", {
        error: error instanceof Error ? error.message : String(error),
      });
      return telegramRequest(token, "sendMessage", {
        chat_id: chatId,
        text,
      });
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as OrderEventPayload;
    const secret =
      req.headers.get("x-smartcam-hook-secret") ??
      payload.hook_secret ??
      "";
    if (secret !== HOOK_SECRET) {
      console.error("[telegram-events] invalid hook secret");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("[telegram-events] missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id,total_amount,status,payment_status,customer_name,customer_phone,customer_region,created_at,items,user_id")
      .eq("id", payload.order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[telegram-events] order not found", {
        orderId: payload.order_id,
        orderError: orderError?.message,
      });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.event_type === "order_created") {
      const chatIds = await resolveAdminChatIds(adminClient);
      const orderText = `🛎️ Yangi buyurtma tushdi!\n\n${renderOrder(order, { admin: true })}`;
      await Promise.all(
        Array.from(chatIds).map((chatId) =>
          sendMessage(botToken, chatId, orderText, buildStatusKeyboard(order.id)),
        ),
      );

      if (payload.user_id) {
        const { data: customer } = await adminClient
          .from("users")
          .select("telegram_id")
          .eq("id", payload.user_id)
          .maybeSingle();

        if (typeof customer?.telegram_id === "number") {
          const userText = `✅ Buyurtmangiz qabul qilindi!\n\n${renderOrder(order)}`;
          await sendMessage(
            botToken,
            customer.telegram_id,
            userText,
            buildUserOrderKeyboard(order),
          );

          if (needsPayment(order)) {
            await prepareReceiptSession(
              adminClient,
              customer.telegram_id,
              payload.user_id,
              order.id,
            );
            await sendMessage(
              botToken,
              customer.telegram_id,
              renderPaymentInstructions(order),
              buildPaymentPromptKeyboard(order.id),
            );
          }

          console.log("[telegram-events] user order confirmation sent", {
            orderId: order.id,
            telegramId: customer.telegram_id,
          });
        }
      }

      console.log("[telegram-events] admin notifications sent", {
        orderId: order.id,
        adminCount: chatIds.size,
      });
    }

    if (payload.event_type === "order_status_changed") {
      const { data: user } = await adminClient
        .from("users")
        .select("telegram_id")
        .eq("id", order.user_id)
        .maybeSingle();

      if (typeof user?.telegram_id === "number") {
        await sendMessage(
          botToken,
          user.telegram_id,
          renderStatusChangedMessage(order, payload.old_status ?? null),
        );

        console.log("[telegram-events] user status notification sent", {
          orderId: order.id,
          telegramId: user.telegram_id,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram-events] unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
