import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { telegramRequest } from "../_shared/telegram.ts";

const projectId = "vhbrbptcnkzkfdbxehgt";
const webhookUrl = `https://${projectId}.supabase.co/functions/v1/telegram-bot`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

    if (!botToken) {
      console.error("[telegram-setup] missing TELEGRAM_BOT_TOKEN secret");
      return new Response(JSON.stringify({ error: "Missing TELEGRAM_BOT_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botInfo = await telegramRequest(botToken, "getMe");
    const setupResult = await telegramRequest(botToken, "setWebhook", {
      url: webhookUrl,
      allowed_updates: ["message", "edited_message", "callback_query"],
      drop_pending_updates: false,
    });

    console.log("[telegram-setup] webhook configured", {
      username: botInfo.username,
      webhookUrl,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        username: botInfo.username,
        webhookUrl,
        telegramResult: setupResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[telegram-setup] unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
