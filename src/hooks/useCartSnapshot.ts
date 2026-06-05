/**
 * useCartSnapshot — savatni serverga saqlash (abandoned cart uchun)
 * Foydalanuvchi 2+ mahsulot qo'shganda, 500ms debounce bilan serverga yuboradi.
 */
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";

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
        const payload = {
          user_id: user.id,
          cart_data: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        };

        const res = await fetch("/api/cart-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) lastSentRef.current = serialized;
      } catch {
        // Silent — muhim emas
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, cart]);
}
