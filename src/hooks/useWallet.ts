import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

async function fetchWallet(userId: string) {
  const { data } = await supabase
    .from("users")
    .select("wallet_balance, cashback_balance, referral_code")
    .eq("id", userId)
    .single();
  return data;
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });

  async function ensureReferralCode(): Promise<string> {
    if (referralCode) return referralCode;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from("users").update({ referral_code: code }).eq("id", user!.id);
    invalidate();
    return code;
  }

  async function addCashback(amount: number) {
    if (!user || amount <= 0) return;
    const newBal = cashbackBalance + amount;
    await supabase.from("users").update({ cashback_balance: newBal }).eq("id", user.id);
    invalidate();
  }

  return { walletBalance, cashbackBalance, referralCode, load: invalidate, ensureReferralCode, addCashback };
}
