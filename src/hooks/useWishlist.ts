import { useState, useCallback } from "react";

const KEY = "hammabop_wishlist";

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(load);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { wishlistIds: ids, toggleWishlist: toggle, inWishlist: has };
}
