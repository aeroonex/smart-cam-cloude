import { useEffect, useState } from "react";
import { Building2, DollarSign, Loader2, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type Store = {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  commission_percent: number;
  balance: number;
  total_sales: number;
  created_at: string;
  is_active: boolean;
};

export function AdminPartners() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [form, setForm] = useState({
    name: "", contact_name: "", contact_phone: "", commission_percent: "10",
  });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("stores" as any).select("*").order("created_at", { ascending: false }) as any);
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        setTableExists(false);
      } else {
        toast.error("Yuklashda xato.");
      }
    } else {
      setStores(data ?? []);
    }
    setLoading(false);
  }

  async function addStore() {
    if (!form.name.trim()) { toast.error("Do'kon nomini kiriting."); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("stores" as any).insert({
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      commission_percent: Number(form.commission_percent) || 10,
      balance: 0,
      total_sales: 0,
      is_active: true,
    }) as any);
    setSaving(false);
    if (error) toast.error("Qo'shib bo'lmadi: " + error.message);
    else {
      toast.success("Do'kon qo'shildi!");
      setForm({ name: "", contact_name: "", contact_phone: "", commission_percent: "10" });
      setShowAdd(false);
      await load();
    }
  }

  async function toggleStore(id: string, cur: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("stores" as any).update({ is_active: !cur }).eq("id", id) as any);
    setStores(prev => prev.map(s => s.id === id ? { ...s, is_active: !cur } : s));
  }

  async function deleteStore(id: string) {
    if (!confirm("Do'konni o'chirishni tasdiqlaysizmi?")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("stores" as any).delete().eq("id", id) as any);
    setStores(prev => prev.filter(s => s.id !== id));
    toast.success("O'chirildi.");
  }

  const totalPayout = stores.reduce((s, st) => s + st.total_sales * (1 - st.commission_percent / 100), 0);
  const totalCommission = stores.reduce((s, st) => s + st.total_sales * (st.commission_percent / 100), 0);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" />
    </div>
  );

  if (!tableExists) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h3 className="mb-2 font-bold text-amber-800">Do'konlar jadvali mavjud emas</h3>
          <p className="mb-4 text-sm text-amber-700">
            Hamkorlar modulini faollashtirish uchun Supabase migration'ni ishga tushiring:
          </p>
          <div className="rounded-xl bg-amber-100 px-4 py-3 text-left text-xs font-mono text-amber-900 mb-4">
            {`CREATE TABLE stores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_name text,
  contact_phone text,
  commission_percent numeric DEFAULT 10,
  balance numeric DEFAULT 0,
  total_sales numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON stores USING (true);`}
          </div>
          <p className="text-xs text-amber-600">
            Yuqoridagi SQL ni Supabase Dashboard → SQL Editor da ishga tushiring
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Jami do'konlar", value: String(stores.length), icon: Building2, color: "bg-blue-50 text-blue-600" },
          { label: "Do'konlarga to'lov", value: formatPrice(totalPayout), icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
          { label: "Sizning komissiya", value: formatPrice(totalCommission), icon: TrendingUp, color: "bg-orange-50 text-[#EE7526]" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">{s.label}</p>
              <p className="font-bold text-neutral-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900">Do'konlar ro'yxati</h3>
        <Button size="sm" onClick={() => setShowAdd(v => !v)}
          className="rounded-xl gap-1.5 bg-[#EE7526] text-white hover:bg-[#d8661c]">
          <Plus className="h-4 w-4" />{showAdd ? "Yopish" : "Yangi do'kon"}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-neutral-900">Yangi hamkor do'kon</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Do'kon nomi *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="TechShop Toshkent" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Komissiya (%)</label>
              <Input type="number" value={form.commission_percent}
                onChange={e => setForm(f => ({ ...f, commission_percent: e.target.value }))}
                placeholder="10" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Mas'ul shaxs</label>
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="Abdullayev Mirzo" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefon</label>
              <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                placeholder="+998 90 123 45 67" className="rounded-xl" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void addStore()} disabled={saving}
              className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Qo'shish
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-full">Bekor</Button>
          </div>
        </div>
      )}

      {/* Stores table */}
      {stores.length === 0 ? (
        <div className="rounded-2xl bg-white border border-neutral-100 py-16 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="text-neutral-400">Hali hamkor do'kon qo'shilmagan</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Do'kon</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Komissiya</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Jami savdo</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">To'lov (do'kon)</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Holat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {stores.map(s => {
                const payout = s.total_sales * (1 - s.commission_percent / 100);
                return (
                  <tr key={s.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900">{s.name}</p>
                      {s.contact_name && (
                        <p className="text-xs text-neutral-400">{s.contact_name} · {s.contact_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-[#EE7526]">
                        {s.commission_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-700">{formatPrice(s.total_sales)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{formatPrice(payout)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => void toggleStore(s.id, s.is_active)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                        }`}>
                        {s.is_active ? "Faol" : "Nofaol"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => void deleteStore(s.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payout explanation */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">Hisoblash tartibi:</p>
        <p>Do'kon to'lovi = Jami savdo × (100 − Komissiya%) / 100</p>
        <p>Sizning daromad = Jami savdo × Komissiya% / 100</p>
      </div>
    </div>
  );
}
