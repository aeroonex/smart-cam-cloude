import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string | null;
};

const CART_STORAGE_KEY = "smartcam_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(CART_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = useCallback((product: Product) => {
    const fallbackImage = product.images?.[0] ?? "/assets/smartcam-outdoor-camera.png";
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(99, item.qty + 1) } : item,
        );
      }
      return [
        ...current,
        { id: product.id, name: product.name, price: Number(product.price), qty: 1, image: fallbackImage },
      ];
    });
    toast.success(`${product.name} savatga qo'shildi.`);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, qty: Math.max(1, Math.min(99, item.qty + delta)) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  return { cart, cartCount, cartTotal, addToCart, updateQuantity, removeFromCart, clearCart };
}
