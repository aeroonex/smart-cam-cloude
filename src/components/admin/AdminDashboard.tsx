import { useEffect, useState } from "react";
import {
  ArrowUpRight, Package, ShoppingBag, Star,
  TrendingUp, Users, Wallet,
} from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import type { AdminSection } from "./adminTypes";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export function AdminDashboard({ onNavigate }: { onNavigate: (s: AdminSection) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("sold_count", { ascending: false }),
      supabase.from("users").select("id", { count: "exact", head: true }),
    ]).then(([o, p, u]) => {
      setOrders(o.data ?? []);
      setProducts(p.data ?? []);
      setUserCount(u.count ?? 0);
      setLoading(false);
    });
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.created_at.startsWith(today));
  const todayRevenue = todayOrders
    .filter(o => o.status !== "rad_etildi")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const totalRevenue = orders
    .filter(o => o.status !== "rad_etildi")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const newOrders = orders.filter(o => o.status === "yangi").length;

  // Last 7 days revenue
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const rev = orders
      .filter(o => o.created_at.startsWith(key) && o.status !== "rad_etildi")
      .reduce((s, o) => s + Number(o.total_amount), 0);
    return { key, label: d.toLocaleDateString("uz-UZ", { weekday: "short" }), rev };
  });
  const maxRev = Math.max(...last7.map(d => d.rev), 1);

  // Payment breakdown
  const paymentMap: Record<string, number> = {};
  orders.forEach(o => {
    const pm = (o as Record<string, unknown>).payment_method as string ?? "Naqd";
    paymentMap[pm] = (paymentMap[pm] ?? 0) + 1;
  });

  // Top products
  const topProducts = products.filter(p => p.sold_count > 0).slice(0, 5);
  // Recent orders
  const recentOrders = orders.slice(0, 5);

  const statusLabel: Record<string, string> = {
    yangi: "Yangi", qabul_qilindi: "Qabul qilindi",
    yetkazilmoqda: "Kuryerda", mijoz_qabul_qildi: "Yopildi", rad_etildi: "Rad etildi",
  };

  if (loading) return <BoxLoader className="py-20" />;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Bugungi daromad", value: formatPrice(todayRevenue),
            sub: `Bugun ${todayOrders.length} ta buyurtma`,
            icon: TrendingUp, iconBg: "bg-blue-100", iconColor: "text-[#1d4f8a]",
          },
          {
            label: "Umumiy daromad", value: formatPrice(totalRevenue),
            sub: `${orders.length} ta jami buyurtma`,
            icon: Wallet, iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
          },
          {
            label: "Yangi buyurtmalar", value: String(newOrders),
            sub: "Kutmoqda", icon: ShoppingBag, iconBg: "bg-red-100", iconColor: "text-red-500",
            action: () => onNavigate("orders"),
          },
          {
            label: "Foydalanuvchilar", value: String(userCount),
            sub: `${products.length} ta mahsulot`,
            icon: Users, iconBg: "bg-blue-100", iconColor: "text-blue-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            onClick={s.action}
            className={`relative overflow-hidden rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm transition ${
              s.action ? "cursor-pointer hover:shadow-md" : ""
            }`}
          >
            {/* decorative circle */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 ${s.iconBg}`} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-xs font-medium text-neutral-400">{s.label}</p>
                <p className="mt-1.5 text-2xl font-extrabold text-neutral-900 tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs text-neutral-500">{s.sub}</p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
            </div>
            {s.action && (
              <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 text-neutral-300" />
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Revenue bar chart */}
        <div className="col-span-2 rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <h3 className="mb-1 font-bold text-neutral-900">Haftalik daromad</h3>
          <p className="mb-4 text-xs text-neutral-400">Oxirgi 7 kun davomida</p>
          <div className="flex h-44 items-end gap-2">
            {last7.map((d) => (
              <div key={d.key} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full flex flex-col items-center">
                  {d.rev > 0 && (
                    <span className="mb-1 text-[9px] font-semibold text-[#1d4f8a] opacity-0 group-hover:opacity-100 transition">
                      {Math.round(d.rev / 1000)}k
                    </span>
                  )}
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#1d4f8a] to-[#f5a460] transition-all hover:from-[#164078]"
                    style={{ height: `${Math.max(6, (d.rev / maxRev) * 140)}px` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-neutral-400 capitalize">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <h3 className="mb-1 font-bold text-neutral-900">To'lov turlari</h3>
          <p className="mb-4 text-xs text-neutral-400">Barcha buyurtmalar bo'yicha</p>
          <div className="space-y-4">
            {Object.entries(paymentMap).length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Ma'lumot yo'q</p>
            ) : Object.entries(paymentMap).map(([method, count]) => {
              const pct = Math.round((count / orders.length) * 100);
              const colors: Record<string, string> = {
                "Naqd": "bg-emerald-400",
                "Karta": "bg-blue-400",
                "Alif Nasiya": "bg-purple-400",
                "Uzum Nasiya": "bg-blue-600",
              };
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-neutral-700">{method}</span>
                    <span className="text-xs text-neutral-500">{count} ta · {pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full transition-all ${colors[method] ?? "bg-[#1d4f8a]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-900">Top mahsulotlar</h3>
              <p className="text-xs text-neutral-400">Sotuvlar bo'yicha</p>
            </div>
            <Star className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Sotilgan mahsulot yo'q</p>
            ) : topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  i === 0 ? "bg-amber-400 text-white" :
                  i === 1 ? "bg-neutral-300 text-white" :
                  i === 2 ? "bg-amber-600/50 text-white" : "bg-blue-100 text-[#1d4f8a]"
                }`}>{i + 1}</span>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg border border-neutral-100 object-cover"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Package className="h-4 w-4 text-[#1d4f8a]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-800">{p.name}</p>
                  <p className="text-xs text-neutral-400">{p.sold_count} ta sotildi</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[#1d4f8a]">{formatPrice(Number(p.price))}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-900">So'nggi buyurtmalar</h3>
              <p className="text-xs text-neutral-400">Yangi kelganlar</p>
            </div>
            <button onClick={() => onNavigate("orders")}
              className="text-xs font-semibold text-[#1d4f8a] hover:underline">
              Hammasini →
            </button>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Buyurtmalar yo'q</p>
            ) : recentOrders.map(o => {
              const items = (o.items as unknown[]) ?? [];
              const statusColor =
                o.status === "yangi" ? "bg-blue-100 text-orange-700" :
                o.status === "rad_etildi" ? "bg-red-100 text-red-600" :
                o.status === "mijoz_qabul_qildi" ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-600";
              return (
                <div key={o.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 hover:bg-neutral-100 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-neutral-800">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                        {statusLabel[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {o.customer_name} · {items.length} ta tovar
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[#1d4f8a]">{formatPrice(Number(o.total_amount))}</p>
                    <p className="text-[10px] text-neutral-400">
                      {new Date(o.created_at).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
