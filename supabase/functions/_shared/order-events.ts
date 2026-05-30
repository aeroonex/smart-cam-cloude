export const HOOK_SECRET = "smartcam-order-hook-v1-5064451675";

export type OrderEventPayload = {
  event_type: "order_created" | "order_status_changed" | "payment_receipt_submitted";
  order_id: string;
  user_id: string;
  new_status?: string | null;
  old_status?: string | null;
  receipt_file_id?: string | null;
  telegram_id?: number | null;
  hook_secret?: string | null;
};

export async function dispatchOrderEvent(payload: OrderEventPayload) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl) {
    console.error("[order-events] SUPABASE_URL missing");
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-smartcam-hook-secret": HOOK_SECRET,
        ...(serviceRoleKey ? { Authorization: `Bearer ${serviceRoleKey}` } : {}),
      },
      body: JSON.stringify({ ...payload, hook_secret: HOOK_SECRET }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[order-events] dispatch failed", { status: response.status, body });
    }
  } catch (error) {
    console.error("[order-events] dispatch error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
