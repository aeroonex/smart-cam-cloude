import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const REFERRAL_BONUS = 5_000; // so'm

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

  // Yangi foydalanuvchi referal kodini kiritganda — ikkalasiga bonus
  async function redeemReferralCode(code: string): Promise<{ ok: boolean; message: string }> {
    if (!user) return { ok: false, message: "Avval tizimga kiring" };
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { ok: false, message: "Kod bo'sh" };

    // Kodning egasini topish
    const { data: referrer, error } = await supabase
      .from("users")
      .select("id, cashback_balance, referral_code")
      .eq("referral_code", trimmed)
      .neq("id", user.id)
      .single();

    if (error || !referrer) {
      return { ok: false, message: "Referal kod topilmadi yoki noto'g'ri" };
    }

    // Yangi foydalanuvchiga bonus
    const { error: newUserErr } = await supabase
      .from("users")
      .update({ cashback_balance: cashbackBalance + REFERRAL_BONUS })
      .eq("id", user.id);

    if (newUserErr) return { ok: false, message: "Bonus qo'shishda xato" };

    // Taklif qiluvchiga ham bonus
    await supabase
      .from("users")
      .update({ cashback_balance: (referrer.cashback_balance ?? 0) + REFERRAL_BONUS })
      .eq("id", referrer.id);

    invalidate();
    return { ok: true, message: `+${REFERRAL_BONUS.toLocaleString()} so'm bonus qo'shildi!` };
  }

  return { walletBalance, cashbackBalance, referralCode, load: invalidate, ensureReferralCode, addCashback, redeemReferralCode };
}
