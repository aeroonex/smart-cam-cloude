import type { Json } from "@/integrations/supabase/types";

export type OrderItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
};

export function formatPrice(value: number) {
  return `${Number(value).toLocaleString("uz-UZ")} so'm`;
}

export function getInitials(name?: string | null) {
  if (!name) return "SC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function extractOrderItems(value: Json): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, Json>;
      return {
        product_id: String(row.product_id ?? ""),
        product_name: String(row.product_name ?? "Mahsulot"),
        price: Number(row.price ?? 0),
        quantity: Number(row.quantity ?? 0),
      } satisfies OrderItem;
    })
    .filter((item): item is OrderItem => Boolean(item));
}
