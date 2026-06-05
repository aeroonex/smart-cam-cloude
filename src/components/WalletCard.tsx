import { Wallet, Gift, Copy, Users, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  cashbackBalance: number;
  walletBalance: number;
  referralCode: string | null;
  onGetReferral: () => Promise<string>;
  referralCount?: number;
};

export function WalletCard({ cashbackBalance, walletBalance, referralCode, onGetReferral, referralCount = 0 }: Props) {
  const [code, setCode] = useState(referralCode);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGetCode() {
    setLoading(true);
    const c = await onGetReferral();
    setCode(c);
    setLoading(false);
  }

  function copyCode() {
    const link = `https://t.me/HammaBopBot?start=ref_${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Havola nusxalandi!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const total = cashbackBalance + walletBalance;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1d4f8a] to-[#f5a623] p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <span className="font-bold text-sm">Mening hamyonim</span>
        </div>
        <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">HammaBop</span>
      </div>

      <p className="text-3xl font-extrabold mb-1">{total.toLocaleString()} so'm</p>

      <div className="flex gap-4 text-xs mb-4">
        {cashbackBalance > 0 && (
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <Gift className="h-3 w-3" />
            Cashback: {cashbackBalance.toLocaleString()} so'm
          </span>
        )}
        {walletBalance > 0 && (
          <span className="bg-white/20 rounded-full px-2 py-1">
            Bonus: {walletBalance.toLocaleString()} so'm
          </span>
        )}
      </div>

      {/* Referral */}
      <div className="border-t border-white/20 pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold">Do'stingni taklif qil</span>
          {referralCount > 0 && (
            <span className="ml-auto text-xs bg-white/20 rounded-full px-2 py-0.5">{referralCount} ta do'st</span>
          )}
        </div>
        <p className="text-xs text-white/80 mb-2">
          Har bir do'sting uchun 10 000 so'm bonus!
        </p>
        {code ? (
          <button
            onClick={copyCode}
            className="flex w-full items-center justify-between rounded-xl bg-white/20 hover:bg-white/30 px-3 py-2 transition"
          >
            <span className="font-mono text-sm font-bold tracking-widest">{code}</span>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        ) : (
          <button
            onClick={() => void handleGetCode()}
            disabled={loading}
            className="w-full rounded-xl bg-white/20 hover:bg-white/30 py-2 text-sm font-semibold transition"
          >
            {loading ? "Yaratilmoqda..." : "Havola olish"}
          </button>
        )}
      </div>
    </div>
  );
}
