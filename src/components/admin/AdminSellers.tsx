import { useEffect, useState, useCallback } from "react";
import {
  UserPlus, Loader2, Package, TrendingUp, Eye, EyeOff,
  Power, Bell, KeyRound, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SellerStat = {
  seller_id: string;
  full_name: string;
  login_code: string | null;
  is_active: boolean;
  joined_at: string;
  handovers_total: number;
  handovers_week: number;
  handovers_today: number;
  revenue_total: number;
  last_handover_at: string | null;
};

type ProfileChange = {
  id: number;
  seller_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

export function AdminSellers() {
  const [stats, setStats] = useState<SellerStat[]>([]);
  const [changes, setChanges] = useState<ProfileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ login: "", password: "", full_name: "", phone: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("seller_stats").select("*").order("handovers_total", { ascending: false }),
      supabase.from("seller_profile_changes").select("*").eq("notified", false).order("created_at", { ascending: false }),
    ]);
    setStats((s as SellerStat[]) ?? []);
    setChanges((c as ProfileChange[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createSeller = async () => {
    if (!form.login || form.password.length < 6 || !form.full_name) {
      toast.error("Login, parol (≥6 belgi) va ismni to'ldiring");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-seller", {
      body: form,
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.message ?? error?.message ?? "Sotuvchi yaratilmadi");
      return;
    }
    toast.success(`Sotuvchi yaratildi: ${form.login}`);
    setForm({ login: "", password: "", full_name: "", phone: "", note: "" });
    void load();
  };

  const toggleActive = async (s: SellerStat) => {
    const { error } = await supabase.from("users")
      .update({ is_active: !s.is_active }).eq("id", s.seller_id);
    if (error) { toast.error("Xato"); return; }
    toast.success(s.is_active ? "Sotuvchi bloklandi" : "Sotuvchi faollashtirildi");
    void load();
  };

  const dismissChange = async (id: number) => {
    await supabase.from("seller_profile_changes").update({ notified: true }).eq("id", id);
    setChanges((prev) => prev.filter((c) => c.id !== id));
  };

  const sellerName = (id: string) => stats.find((s) => s.seller_id === id)?.full_name ?? "Sotuvchi";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Sotuvchilar</h2>
          <p className="text-sm text-gray-500">Hisob yaratish, analitika va kuzatuv</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Yangilash
        </button>
      </div>

      {/* Profil o'zgarish bildirishnomalari (push surrogat) */}
      {changes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold">
            <Bell className="h-4 w-4" /> Sotuvchi profil o'zgarishlari ({changes.length})
          </div>
          <div className="space-y-2">
            {changes.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span>
                  <b>{sellerName(c.seller_id)}</b> — <span className="text-gray-500">{c.field}</span>{" "}
                  o'zgartirdi: <code className="text-rose-600">{c.old_value ?? "—"}</code> →{" "}
                  <code className="text-emerald-600">{c.new_value ?? "—"}</code>
                </span>
                <button onClick={() => dismissChange(c.id)} className="text-xs text-gray-400 hover:text-gray-700">
                  ✓ ko'rildi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yangi sotuvchi yaratish */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 font-semibold text-gray-800">
          <UserPlus className="h-5 w-5 text-[#1d4f8a]" /> Yangi sotuvchi qo'shish
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Login (masalan: aziz01)"
            value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
          <div className="relative">
            <input className="w-full rounded-lg border px-3 py-2 pr-9 text-sm" type={showPw ? "text" : "password"}
              placeholder="Parol (≥6 belgi)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="To'liq ism"
            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Telefon (ixtiyoriy)"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" placeholder="Izoh (ixtiyoriy)"
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button onClick={createSeller} disabled={creating}
          className="mt-3 flex items-center gap-2 rounded-lg bg-[#1d4f8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Yaratish
        </button>
      </div>

      {/* Sotuvchilar ro'yxati + analitika */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b font-semibold text-gray-800">
          <TrendingUp className="h-5 w-5 text-emerald-500" /> Analitika ({stats.length})
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : stats.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Hozircha sotuvchilar yo'q</p>
        ) : (
          <div className="divide-y">
            {stats.map((s) => (
              <div key={s.seller_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d4f8a]/10 font-bold text-[#1d4f8a]">
                  {s.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{s.full_name}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <KeyRound className="h-3 w-3" /> {s.login_code}
                    {!s.is_active && <span className="ml-1 rounded bg-rose-100 px-1.5 text-rose-600">bloklangan</span>}
                  </p>
                </div>
                <div className="flex gap-4 text-center text-sm">
                  <Stat label="Bugun" value={s.handovers_today} />
                  <Stat label="Hafta" value={s.handovers_week} />
                  <Stat label="Jami" value={s.handovers_total} icon />
                </div>
                <button onClick={() => toggleActive(s)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    s.is_active ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                  <Power className="h-3.5 w-3.5" /> {s.is_active ? "Bloklash" : "Faollashtirish"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: boolean }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 font-bold text-gray-900">
        {icon && <Package className="h-3.5 w-3.5 text-[#1d4f8a]" />}{value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
