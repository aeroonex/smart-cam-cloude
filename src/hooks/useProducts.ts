import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    toast.error("Mahsulotlarni yuklashda xato yuz berdi.");
    return [];
  }
  return data ?? [];
}

export function useProducts() {
  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 2 * 60_000,
  });

  return { products, loading };
}
