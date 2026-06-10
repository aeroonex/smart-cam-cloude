import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type WalletTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "cashback" | "referral_bonus" | "wallet_used" | "refund";
  description: string | null;
  created_at: string;
};

async function fetchWallet(userId: string) {
  const [walletRes, txRes] = await Promise.all([
    supabase
      .from("users")
      .select("wallet_balance, cashback_balance, referral_code")
      .eq("id", userId)
      .single(),
    supabase
      .from("wallet_transactions" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    wallet_balance: walletRes.data?.wallet_balance ?? 0,
    cashback_balance: walletRes.data?.cashback_balance ?? 0,
    referral_code: walletRes.data?.referral_code ?? null,
    transactions: (txRes.data ?? []) as WalletTransaction[],
  };
}

async function getBonusAmount(): Promise<number> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "referral_bonus_amount")
    .single();
  return Number(data?.value ?? 5000);
}

export function useWallet(user: User | null) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const walletBalance = data?.wallet_balance ?? 0;
  const cashbackBalance = data?.cashback_balance ?? 0;
  const referralCode = data?.referral_code ?? null;
  const transactions = data?.transactions ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });

  // Auto-assign referral code on first load if missing
  useEffect(() => {
    if (!user || referralCode) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    supabase.from("users").update({ referral_code: code }).eq("id", user.id).then(() => {
      invalidate();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, referralCode]);

  async function ensureReferralCode(): Promise<string> {
    if (referralCode) return referralCode;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from("users").update({ referral_code: code }).eq("id", user!.id);
    invalidate();
    return code;
  }

  async function addCashback(amount: number, description?: string) {
    if (!user || amount <= 0) return;
    const newBal = cashbackBalance + amount;
    await supabase.from("users").update({ cashback_balance: newBal }).eq("id", user.id);
    await supabase.from("wallet_transactions" as never).insert({
      user_id: user.id,
      amount,
      type: "cashback",
      description: description ?? "Cashback bonus",
    });
    invalidate();
  }

  async function redeemReferralCode(code: string): Promise<{ ok: boolean; message: string; bonusAmount?: number }> {
    if (!user) return { ok: false, message: "Avval tizimga kiring" };
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { ok: false, message: "Kod bo'sh" };

    // Check if already used (localStorage fast-check)
    const alreadyKey = `ref_used_${user.id}`;
    if (localStorage.getItem(alreadyKey)) {
      return { ok: false, message: "Referal koddan allaqachon foydalangansiz" };
    }

    // Use SECURITY DEFINER RPC — bypasses RLS safely
    const { data, error } = await supabase.rpc("redeem_referral_code" as never, {
      p_code: trimmed,
      p_new_user: user.id,
    } as never);

    if (error) {
      console.error("[redeemReferralCode]", error);
      return { ok: false, message: "Serverda xatolik yuz berdi" };
    }

    const result = data as { ok: boolean; message: string; bonus_amount?: number };

    if (result.ok) {
      localStorage.setItem(alreadyKey, "1");
      invalidate();
      const bonusAmount = result.bonus_amount ?? 5000;
      return {
        ok: true,
        message: `+${bonusAmount.toLocaleString()} so'm bonus qo'shildi!`,
        bonusAmount,
      };
    }

    return { ok: false, message: result.message };
  }

  return {
    walletBalance,
    cashbackBalance,
    referralCode,
    transactions,
    load: invalidate,
    ensureReferralCode,
    addCashback,
    redeemReferralCode,
  };
}
