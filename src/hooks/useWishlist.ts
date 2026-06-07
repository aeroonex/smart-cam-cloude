import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const KEY = "hammabop_wishlist";

function loadLocal(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function useWishlist(user?: User | null) {
  const [ids, setIds] = useState<string[]>(loadLocal);
  const [synced, setSynced] = useState(false);

  // Login bo'lganda serverdagi sevimlilarni yuklash va localga birlashtirish
  useEffect(() => {
    if (!user || synced) return;
    supabase
      .from("wishlist_items" as never)
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }: { data: { product_id: string }[] | null }) => {
        if (!data) { setSynced(true); return; }
        const serverIds = data.map(r => r.product_id);
        const localIds = loadLocal();
        const merged = Array.from(new Set([...serverIds, ...localIds]));
        setIds(merged);
        localStorage.setItem(KEY, JSON.stringify(merged));
        // Localda mavjud bo'lgan, serverdagida yo'q elementlarni yuklab olish
        const toUpload = localIds.filter(id => !serverIds.includes(id));
        if (toUpload.length > 0) {
          supabase.from("wishlist_items" as never).upsert(
            toUpload.map(id => ({ user_id: user.id, product_id: id }))
          ).then(() => {});
        }
        setSynced(true);
      })
      .catch(() => { setSynced(true); }); // server yo'q bo'lsa localStorage bilan ishlayveradi
  }, [user, synced]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const isAdding = !prev.includes(id);
      const next = isAdding ? [...prev, id] : prev.filter((x) => x !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      // Server ga sinxronlashtirish
      if (user) {
        if (isAdding) {
          supabase.from("wishlist_items" as never)
            .upsert({ user_id: user.id, product_id: id })
            .then(() => {});
        } else {
          supabase.from("wishlist_items" as never)
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", id)
            .then(() => {});
        }
      }
      return next;
    });
  }, [user]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { wishlistIds: ids, toggleWishlist: toggle, inWishlist: has };
}
