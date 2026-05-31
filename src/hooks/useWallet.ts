import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useWallet(user: User | null) {
  const [walletBalance, setWalletBalance] = useState(0);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("wallet_balance, cashback_balance, referral_code")
      .eq("id", user.id)
      .single();
    if (data) {
      setWalletBalance(data.wallet_balance ?? 0);
      setCashbackBalance(data.cashback_balance ?? 0);
      setReferralCode(data.referral_code ?? null);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function ensureReferralCode(): Promise<string> {
    if (referralCode) return referralCode;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from("users").update({ referral_code: code }).eq("id", user!.id);
    setReferralCode(code);
    return code;
  }

  async function addCashback(amount: number) {
    if (!user || amount <= 0) return;
    const newBal = cashbackBalance + amount;
    await supabase.from("users").update({ cashback_balance: newBal }).eq("id", user.id);
    setCashbackBalance(newBal);
  }

  return { walletBalance, cashbackBalance, referralCode, load, ensureReferralCode, addCashback };
}
