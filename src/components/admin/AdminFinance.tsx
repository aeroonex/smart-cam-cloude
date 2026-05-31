import { useEffect, useState } from "react";
import { Award, Loader2, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  cashback_balance: number;
  wallet_balance: number;
  referral_code: string | null;
};

export function AdminFinance() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("users")
      .select("id, full_name, email, cashback_balance, wallet_balance, referral_code")
      .order("cashback_balance", { ascending: false })
      .then(({ data }) => {
        setUsers((data as UserRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const totalCashback = users.reduce((s, u) => s + (u.cashback_balance ?? 0), 0);
  const totalWallet = users.reduce((s, u) => s + (u.wallet_balance ?? 0), 0);
  const usersWithBonus = users.filter(u => u.cashback_balance > 0 || u.wallet_balance > 0).length;
  const topEarners = users.filter(u => u.cashback_balance > 0).slice(0, 10);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Jami cashback (aylanmada)", value: formatPrice(totalCashback),
            icon: Award, bg: "bg-amber-50", color: "text-amber-600",
            sub: "Foydalanuvchilar hisobida",
          },
          {
            label: "Jami hamyon balansi", value: formatPrice(totalWallet),
            icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600",
            sub: "To'lovga tayyor mablag'",
          },
          {
            label: "Bonusli foydalanuvchilar", value: String(usersWithBonus),
            icon: Users, bg: "bg-blue-50", color: "text-blue-600",
            sub: `Jami ${users.length} ta foydalanuvchi`,
          },
          {
            label: "O'rtacha cashback", value: formatPrice(users.length ? totalCashback / users.length : 0),
            icon: TrendingUp, bg: "bg-orange-50", color: "text-[#EE7526]",
            sub: "Foydalanuvchi boshiga",
          },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-400">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold text-neutral-900">{s.value}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{s.sub}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cashback distribution chart */}
      <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
        <h3 className="mb-1 font-bold text-neutral-900">Cashback taqsimoti</h3>
        <p className="mb-4 text-xs text-neutral-400">Foydalanuvchilar bo'yicha</p>
        <div className="space-y-3">
          {[
            { label: "0 so'm (bonus yo'q)", count: users.filter(u => !u.cashback_balance).length, color: "bg-neutral-200" },
            { label: "1 — 10 000 so'm", count: users.filter(u => u.cashback_balance > 0 && u.cashback_balance <= 10000).length, color: "bg-blue-300" },
            { label: "10 001 — 50 000 so'm", count: users.filter(u => u.cashback_balance > 10000 && u.cashback_balance <= 50000).length, color: "bg-amber-400" },
            { label: "50 001+ so'm", count: users.filter(u => u.cashback_balance > 50000).length, color: "bg-[#EE7526]" },
          ].map(b => {
            const pct = users.length ? Math.round((b.count / users.length) * 100) : 0;
            return (
              <div key={b.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-neutral-700">{b.label}</span>
                  <span className="text-xs text-neutral-400">{b.count} ta · {pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${b.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top earners */}
      <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
        <h3 className="mb-1 font-bold text-neutral-900">Top Cashback egolari</h3>
        <p className="mb-4 text-xs text-neutral-400">Eng ko'p bonus to'plagan foydalanuvchilar</p>
        {topEarners.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Hali bonus to'planmagan</p>
        ) : (
          <div className="space-y-2">
            {topEarners.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-neutral-50 transition">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  i === 0 ? "bg-amber-400 text-white" :
                  i === 1 ? "bg-neutral-300 text-white" :
                  i === 2 ? "bg-amber-600/50 text-white" : "bg-orange-100 text-[#EE7526]"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-800">
                    {u.full_name || u.email || "Foydalanuvchi"}
                  </p>
                  {u.referral_code && (
                    <p className="text-[10px] text-neutral-400">Referal: {u.referral_code}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-600">{formatPrice(u.cashback_balance)}</p>
                  {u.wallet_balance > 0 && (
                    <p className="text-[10px] text-emerald-600">+{formatPrice(u.wallet_balance)} hamyon</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">Cashback mexanizmi:</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Har bir mahsulot xaridida cashback avtomatik yig'iladi</li>
          <li>Keyingi buyurtmada checkout sahifasida ishlatiladi</li>
          <li>Referal dasturi: har bir taklif uchun bonus beriladi</li>
          <li>Admin cashback miqdorini mahsulot kartasidan belgilaydi</li>
        </ul>
      </div>
    </div>
  );
}
