import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import {
  encodeOrderToken,
  signLinkPayload,
  telegramRequest,
} from "../_shared/telegram.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[telegram-link] missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !botToken) {
      console.error("[telegram-link] missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[telegram-link] failed to resolve user", { userError: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const type = body?.type === "order" ? "order" : "connect";
    const orderId = typeof body?.orderId === "string" ? body.orderId : null;

    if (type === "order") {
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderError } = await adminClient
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (orderError || !order) {
        console.error("[telegram-link] order not found for user", {
          orderId,
          userId: user.id,
          orderError: orderError?.message,
        });
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const botInfo = await telegramRequest(botToken, "getMe");
    const username = botInfo.username;

    if (!username) {
      console.error("[telegram-link] bot username not resolved");
      return new Response(JSON.stringify({ error: "Bot username not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compactUserId = user.id.replace(/-/g, "");
    const timestamp = Math.floor(Date.now() / 1000).toString(36);
    const signature = await signLinkPayload(botToken, `${compactUserId}:${timestamp}`);

    const startParam =
      type === "order" && orderId
        ? `order_${encodeOrderToken(orderId)}`
        : `link_${compactUserId}_${timestamp}_${signature}`;

    console.log("[telegram-link] generated bot link", { userId: user.id, type, orderId });

    return new Response(
      JSON.stringify({
        url: `https://t.me/${username}?start=${startParam}`,
        username,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[telegram-link] unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
