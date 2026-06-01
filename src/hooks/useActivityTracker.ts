import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useActivityTracker(userId: string | null | undefined) {
  const sessionId = useRef<string | null>(null);
  const lastPing = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    async function startSession() {
      const { data } = await (supabase.from("user_sessions" as never).insert({ user_id: userId }).select("id").single() as unknown as Promise<{ data: { id: string } | null }>);
      if (data) sessionId.current = data.id;
      await supabase.from("users").update({ last_active: new Date().toISOString() }).eq("id", userId!);
    }

    async function endSession() {
      if (!sessionId.current) return;
      await (supabase.from("user_sessions" as never).update({ ended_at: new Date().toISOString() }).eq("id", sessionId.current) as unknown as Promise<unknown>);
    }

    async function ping() {
      const now = Date.now();
      if (now - lastPing.current < 60_000) return;
      lastPing.current = now;
      await supabase.from("users").update({ last_active: new Date().toISOString() }).eq("id", userId!);
    }

    startSession();

    const interval = setInterval(ping, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") endSession();
      else startSession();
    };
    document.addEventListener("visibilitychange", onVisibility);

    window.addEventListener("beforeunload", endSession);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", endSession);
      endSession();
    };
  }, [userId]);
}
