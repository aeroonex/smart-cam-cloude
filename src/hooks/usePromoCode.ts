import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PromoCode = Database["public"]["Tables"]["promo_codes"]["Row"];

export type PromoResult = {
  code: PromoCode;
  discountAmount: number;
};

export function usePromoCode() {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<PromoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyCode(code: string, cartTotal: number): Promise<boolean> {
    setLoading(true);
    setError(null);

    const { data, error: dbErr } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    setLoading(false);

    if (dbErr || !data) {
      setError("Promokod topilmadi yoki faol emas");
      return false;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError("Promokod muddati tugagan");
      return false;
    }

    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      setError("Promokod foydalanish limiti tugagan");
      return false;
    }

    const discountAmount =
      data.discount_type === "percent"
        ? Math.round((cartTotal * data.discount_value) / 100)
        : data.discount_value;

    setApplied({ code: data, discountAmount });
    return true;
  }

  function remove() {
    setApplied(null);
    setError(null);
  }

  async function markUsed(code: string) {
    await supabase.rpc("increment_promo_uses" as never, { code_text: code } as never).catch(() => {
      // fallback manual increment
      supabase
        .from("promo_codes")
        .select("uses_count")
        .eq("code", code)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase.from("promo_codes").update({ uses_count: data.uses_count + 1 }).eq("code", code);
          }
        });
    });
  }

  return { loading, applied, error, applyCode, remove, markUsed };
}
