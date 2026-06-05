import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type MonthStats = {
  totalOrders: number;
  totalRevenue: number;
  myCommission: number;
  storeStats: Record<string, { count: number; total: number }>;
};

const COMMISSION_RATE = 0.05;

export function AdminTaxReport() {
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function loadStats() {
    setLoading(true);
    setStats(null);

    const from = `${month}-01T00:00:00Z`;
    const to   = new Date(new Date(from).setMonth(new Date(from).getMonth() + 1)).toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select("id,total_amount,store_name,payment_method,created_at")
      .gte("created_at", from)
      .lt("created_at", to)
      .eq("status", "mijoz_qabul_qildi");

    if (!orders) { setLoading(false); return; }

    const storeStats: Record<string, { count: number; total: number }> = {};
    let totalRevenue = 0;

    for (const o of orders) {
      const store = o.store_name ?? "Nomalum";
      if (!storeStats[store]) storeStats[store] = { count: 0, total: 0 };
      storeStats[store].count++;
      storeStats[store].total += o.total_amount ?? 0;
      totalRevenue += o.total_amount ?? 0;
    }

    setStats({
      totalOrders: orders.length,
      totalRevenue,
      myCommission: Math.round(totalRevenue * COMMISSION_RATE),
      storeStats,
    });
    setLoading(false);
  }

  async function downloadCsv() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/tax-report?month=${month}`);
      if (!res.ok) throw new Error("Server xatosi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hammabop_tax_${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: client-side CSV
      if (!stats) return;
      const lines = [
        `"HammaBop Soliq Hisoboti — ${month}"`,
        "",
        `"Do'kon","Buyurtmalar","Jami aylanma","Komissiya (${(COMMISSION_RATE * 100).toFixed(0)}%)"`,
        ...Object.entries(stats.storeStats).map(([store, d]) =>
          `"${store}","${d.count}","${d.total}","${Math.round(d.total * COMMISSION_RATE)}"`
        ),
        "",
        `"JAMI","${stats.totalOrders}","${stats.totalRevenue}","${stats.myCommission}"`,
      ];
      const csv = "﻿" + lines.join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `hammabop_tax_${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Oy:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button onClick={loadStats} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Hisobotni ko'rish
        </Button>
        {stats && (
          <Button onClick={downloadCsv} disabled={downloading} size="sm" variant="outline">
            {downloading
              ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
              : <Download className="w-4 h-4 mr-1" />}
            Excel (CSV) yuklab olish
          </Button>
        )}
      </div>

      {stats && (
        <div className="space-y-4">
          {/* Umumiy kartalar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium">Buyurtmalar</p>
              <p className="text-2xl font-bold text-blue-800">{stats.totalOrders}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium">Jami aylanma</p>
              <p className="text-xl font-bold text-green-800">{formatPrice(stats.totalRevenue)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs text-purple-600 font-medium">Sizning komissiya (5%)</p>
              <p className="text-xl font-bold text-purple-800">{formatPrice(stats.myCommission)}</p>
            </div>
          </div>

          {/* Do'konlar jadvali */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Do'konlar bo'yicha</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">Do'kon</th>
                  <th className="text-right px-4 py-2">Buyurtmalar</th>
                  <th className="text-right px-4 py-2">Jami aylanma</th>
                  <th className="text-right px-4 py-2">Komissiya (5%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.storeStats).map(([store, d]) => (
                  <tr key={store} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{store}</td>
                    <td className="px-4 py-2.5 text-right">{d.count}</td>
                    <td className="px-4 py-2.5 text-right">{formatPrice(d.total)}</td>
                    <td className="px-4 py-2.5 text-right text-purple-600 font-medium">
                      {formatPrice(Math.round(d.total * COMMISSION_RATE))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2">
                <tr>
                  <td className="px-4 py-2.5">JAMI</td>
                  <td className="px-4 py-2.5 text-right">{stats.totalOrders}</td>
                  <td className="px-4 py-2.5 text-right">{formatPrice(stats.totalRevenue)}</td>
                  <td className="px-4 py-2.5 text-right text-purple-700">{formatPrice(stats.myCommission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
