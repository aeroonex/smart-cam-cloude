import { Copy, Check, Gift, ArrowUpRight, ArrowDownLeft, TrendingUp, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { WalletTransaction } from "@/hooks/useWallet";

type Props = {
  cashbackBalance: number;
  walletBalance: number;
  referralCode: string | null;
  onGetReferral: () => Promise<string>;
  transactions?: WalletTransaction[];
};

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  cashback:       { label: "Cashback",        color: "text-emerald-600", bg: "bg-emerald-50" },
  referral_bonus: { label: "Referal bonus",   color: "text-blue-600",    bg: "bg-blue-50"    },
  refund:         { label: "Qaytarildi",       color: "text-purple-600",  bg: "bg-purple-50"  },
  wallet_used:    { label: "Xaridda ishlatildi", color: "text-red-500",   bg: "bg-red-50"     },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export function WalletCard({ cashbackBalance, walletBalance, referralCode, onGetReferral, transactions = [] }: Props) {
  const [code, setCode] = useState(referralCode);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGetCode() {
    setLoadingCode(true);
    const c = await onGetReferral();
    setCode(c);
    setLoadingCode(false);
  }

  function copyCode() {
    const val = code ?? "";
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      toast.success("Referal kod nusxalandi!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareCode() {
    const link = `https://t.me/HammaBopBot?start=ref_${code}`;
    if (navigator.share) {
      navigator.share({ title: "HammaBop referal", text: `Mening referal kodum: ${code}`, url: link }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link).then(() => toast.success("Havola nusxalandi!"));
    }
  }

  const total = cashbackBalance + walletBalance;

  return (
    <div className="space-y-3">
      {/* ── Balance card ── */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-br from-[#1d4f8a] via-[#2563a8] to-[#1d4f8a] px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Hamyon balansi</span>
            <span className="text-xs bg-white/15 rounded-full px-2.5 py-0.5 text-white/80">HammaBop</span>
          </div>
          <p className="text-[2.2rem] font-black text-white leading-none mb-3">
            {total.toLocaleString()} <span className="text-lg font-semibold text-white/60">so'm</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {cashbackBalance > 0 && (
              <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1 text-white">
                <Gift className="h-3 w-3" />
                Cashback: {cashbackBalance.toLocaleString()} so'm
              </span>
            )}
            {walletBalance > 0 && (
              <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1 text-white">
                <TrendingUp className="h-3 w-3" />
                Bonus: {walletBalance.toLocaleString()} so'm
              </span>
            )}
            {total === 0 && (
              <span className="text-xs text-white/50">Hali balans yo'q</span>
            )}
          </div>
        </div>

        {/* ── Referral code section ── */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-100 px-5 py-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
            Sizning referal kodingiz
          </p>
          {code ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-between rounded-xl bg-white border border-amber-200 px-4 py-2.5 shadow-sm">
                <span className="font-mono text-xl font-black tracking-[0.2em] text-neutral-900">{code}</span>
              </div>
              <button
                onClick={copyCode}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm active:scale-95 transition"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={shareCode}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1d4f8a] text-white shadow-sm active:scale-95 transition"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => void handleGetCode()}
              disabled={loadingCode}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white active:scale-95 transition disabled:opacity-50"
            >
              {loadingCode ? "Yaratilmoqda..." : "Referal kod olish"}
            </button>
          )}
          <p className="text-xs text-amber-600 mt-2">
            Do'stingiz shu kodni kiritsa — ikkalangiz ham bonus olasiz!
          </p>
        </div>
      </div>

      {/* ── Transaction history ── */}
      {transactions.length > 0 && (
        <div className="rounded-2xl bg-white border border-neutral-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-50">
            <h3 className="text-sm font-bold text-neutral-900">Tranzaksiyalar tarixi</h3>
          </div>
          <div className="divide-y divide-neutral-50">
            {transactions.map(tx => {
              const meta = TYPE_META[tx.type] ?? { label: tx.type, color: "text-neutral-600", bg: "bg-neutral-50" };
              const isIncome = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                    {isIncome
                      ? <ArrowDownLeft className={`h-4 w-4 ${meta.color}`} />
                      : <ArrowUpRight className="h-4 w-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{meta.label}</p>
                    {tx.description && (
                      <p className="text-xs text-neutral-400 truncate">{tx.description}</p>
                    )}
                    <p className="text-[11px] text-neutral-300 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                    {isIncome ? "+" : ""}{tx.amount.toLocaleString()} so'm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="rounded-2xl bg-white border border-neutral-100 px-4 py-8 text-center">
          <p className="text-sm text-neutral-400">Hali tranzaksiya yo'q</p>
          <p className="text-xs text-neutral-300 mt-1">Xarid qiling yoki referal bonus oling</p>
        </div>
      )}
    </div>
  );
}
