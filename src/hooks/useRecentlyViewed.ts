import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const LOCAL_KEY = "hammabop_recently_viewed";
const MAX_LOCAL = 20;

function getLocal(): string[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]"); } catch { return []; }
}

function setLocal(ids: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids.slice(0, MAX_LOCAL)));
}

export function useRecentlyViewed(user: User | null) {
  const [viewedIds, setViewedIds] = useState<string[]>(getLocal);

  const track = useCallback(async (productId: string) => {
    // always update localStorage immediately
    setViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX_LOCAL);
      setLocal(next);
      return next;
    });
    // sync to DB if logged in
    if (user) {
      await supabase.from("recently_viewed").upsert(
        { user_id: user.id, product_id: productId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,product_id" }
      );
    }
  }, [user]);

  // on login, load from DB and merge
  useEffect(() => {
    if (!user) return;
    supabase
      .from("recently_viewed")
      .select("product_id, viewed_at")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return;
        const dbIds = data.map((r) => r.product_id);
        const local = getLocal();
        const merged = [...new Set([...local, ...dbIds])].slice(0, MAX_LOCAL);
        setLocal(merged);
        setViewedIds(merged);
      });
  }, [user]);

  return { viewedIds, track };
}
