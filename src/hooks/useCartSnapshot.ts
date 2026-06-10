/**
 * useCartSnapshot — savatni Supabase'ga saqlash (abandoned cart uchun)
 * Foydalanuvchi 2+ mahsulot qo'shganda, 800ms debounce bilan yuboradi.
 * Express serveri shart emas — to'g'ridan Supabase'ga yozadi.
 */
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type CartItem = { id: string; name: string; price: number; quantity: number };

export function useCartSnapshot(user: User | null, cart: CartItem[]) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!user || cart.length < 2) return;

    const serialized = JSON.stringify(cart);
    if (serialized === lastSentRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        await supabase
          .from("cart_snapshots")
          .upsert(
            {
              user_id: user.id,
              cart_data: cart.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
              })),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        lastSentRef.current = serialized;
      } catch {
        // Silent — muhim emas, ilovani bloklash shart emas
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, cart]);
}
