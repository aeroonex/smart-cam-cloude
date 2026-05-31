import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { HOOK_SECRET, type OrderEventPayload } from "../_shared/order-events.ts";
import {
  buildPaymentPromptKeyboard,
  buildStatusKeyboard,
  buildUserOrderKeyboard,
  needsPayment,
  ORDER_SELECT,
  prepareReceiptSession,
  renderOrder,
  renderPaymentInstructions,
  renderStatusChangedMessage,
  resolveAdminChatIds,
} from "../_shared/smartcam-bot.ts";
import { sendMessage } from "../_shared/bot-send.ts";

// ─── Idempotency helpers ──────────────────────────────────────────────────────

async function claimEvent(
  adminClient: ReturnType<typeof createClient>,
  key: string,
): Promise<boolean> {
  const { error } = await adminClient
    .from("telegram_event_log")
    .insert({ event_key: key });

  if (!error) return true; // claimed successfully

  // Duplicate key = already processed
  if (error.code === "23505") {
    console.log("[telegram-events] event already processed, skipping", { key });
    return false;
  }

  // Unknown DB error — log but proceed (better to send twice than not at all)
  console.error("[telegram-events] claimEvent DB error", { key, error: error.message });
  return true;
}

// ─── Server ───────────────────────────────────────────────────────────────────

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

    // ── Validate event type ───────────────────────────────────────────────────
    if (!payload.event_type || !payload.order_id) {
      console.warn("[telegram-events] missing event_type or order_id — likely a raw DB webhook, ignoring");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(ORDER_SELECT)
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

    // ── order_created ─────────────────────────────────────────────────────────
    if (payload.event_type === "order_created") {
      const ok = await claimEvent(adminClient, `order_created:${payload.order_id}`);
      if (!ok) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mijozning o'z telegram ID'sini oldindan aniqlaymiz — admin xabari unga bormasligi uchun
      let customerTelegramId: number | null = null;
      if (payload.user_id) {
        const { data: customer } = await adminClient
          .from("users")
          .select("telegram_id")
          .eq("id", payload.user_id)
          .maybeSingle();
        if (typeof customer?.telegram_id === "number") {
          customerTelegramId = customer.telegram_id;
        }
      }

      const chatIds = await resolveAdminChatIds(adminClient);
      // Mijozning o'zi admin bo'lsa ham, unga admin panelini yubormaymiz
      if (customerTelegramId !== null) chatIds.delete(customerTelegramId);

      const orderText = `🛎️ Yangi buyurtma tushdi!\n\n${renderOrder(order, { admin: true })}`;
      await Promise.all(
        Array.from(chatIds).map((chatId) =>
          sendMessage(botToken, chatId, orderText, buildStatusKeyboard(order.id)),
        ),
      );

      if (customerTelegramId !== null && payload.user_id) {
        {
          const userText = `✅ Buyurtmangiz qabul qilindi!\n\n${renderOrder(order)}`;
          await sendMessage(botToken, customerTelegramId, userText, buildUserOrderKeyboard(order));

          if (needsPayment(order)) {
            await prepareReceiptSession(adminClient, customerTelegramId, payload.user_id, order.id);
            await sendMessage(botToken, customerTelegramId, renderPaymentInstructions(order), buildPaymentPromptKeyboard(order.id));
          }

          console.log("[telegram-events] user order confirmation sent", {
            orderId: order.id,
            telegramId: customerTelegramId,
          });
        }
      }

      console.log("[telegram-events] admin notifications sent", {
        orderId: order.id,
        adminCount: chatIds.size,
      });
    }

    // ── order_status_changed ──────────────────────────────────────────────────
    if (payload.event_type === "order_status_changed") {
      const eventKey = `order_status_changed:${payload.order_id}:${payload.new_status ?? order.status}`;
      const ok = await claimEvent(adminClient, eventKey);
      if (!ok) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
          newStatus: payload.new_status,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[telegram-events] unexpected error", {
      error: errMsg,
      stack: error instanceof Error ? error.stack : "",
    });

    try {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (botToken && supabaseUrl && serviceRoleKey) {
        const { createClient: mkClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.4");
        const { resolveAdminChatIds } = await import("../_shared/smartcam-bot.ts");
        const { sendMessage: sm } = await import("../_shared/bot-send.ts");
        const ac = mkClient(supabaseUrl, serviceRoleKey);
        const chatIds = await resolveAdminChatIds(ac);
        const text = `⚠️ telegram-events XATO:\n\`\`\`\n${errMsg.slice(0, 700)}\n\`\`\``;
        await Promise.all(Array.from(chatIds).map((id) => sm(botToken, id, text).catch(() => {})));
      }
    } catch { /* never throw from error reporter */ }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
