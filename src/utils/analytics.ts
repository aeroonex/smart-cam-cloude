import { supabase } from "@/integrations/supabase/client";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

type EventName =
  | "button_click"
  | "product_view"
  | "video_complete"
  | "add_to_cart"
  | "checkout"
  | "search"
  | "screen_view"
  | "share"
  | "scan";

type Props = Record<string, string | number | boolean | null>;

const queue: { name: EventName; props: Props; ts: number }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Mobil native user-behavior tracking — eventlarni to'plab,
 * batch ko'rinishida `analytics_events` jadvaliga yuboradi.
 * Tarmoq yo'q bo'lsa localStorage queue da saqlanadi.
 */
export function track(name: EventName, props: Props = {}) {
  queue.push({
    name,
    props: { ...props, platform: isNative() ? "android" : "web" },
    ts: Date.now(),
  });
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 4000);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = batch.map((e) => ({
      user_id: user?.id ?? null,
      event_name: e.name,
      props: e.props,
      created_at: new Date(e.ts).toISOString(),
    }));
    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) throw error;
  } catch {
    // Offline — keyinroq yuborish uchun saqlab qo'yamiz
    try {
      const stored = JSON.parse(localStorage.getItem("analytics_pending") ?? "[]");
      localStorage.setItem("analytics_pending", JSON.stringify([...stored, ...batch].slice(-200)));
    } catch {}
  }
}

/** Internet qaytganda saqlangan eventlarni qayta yuborish */
export async function flushPending() {
  try {
    const stored = JSON.parse(localStorage.getItem("analytics_pending") ?? "[]");
    if (!stored.length) return;
    localStorage.removeItem("analytics_pending");
    for (const e of stored) queue.push(e);
    await flush();
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushPending);
  window.addEventListener("beforeunload", flush);
}
