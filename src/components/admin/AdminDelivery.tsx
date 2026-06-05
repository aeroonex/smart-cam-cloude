import { useEffect, useState } from "react";
import {
  Edit3, Loader2, Plus, Trash2, Truck, X, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type Provider = {
  id: string;
  name: string;
  company_name: string | null;
  contact: string | null;
  service_fee: number;
  is_active: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  name: "", company_name: "", contact: "", service_fee: "",
};

export function AdminDelivery() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase.from("delivery_providers" as never).select("*").order("created_at", { ascending: false }) as unknown as Promise<{ data: Provider[] | null }>);
    setProviders(data ?? []);
    setLoading(false);
  }

  function startEdit(p: Provider) {
    setEditId(p.id);
    setForm({
      name: p.name,
      company_name: p.company_name ?? "",
      contact: p.contact ?? "",
      service_fee: String(p.service_fee),
    });
    setShowAdd(false);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Yetkazib beruvchi nomini kiriting."); return; }
    const fee = Number(form.service_fee);
    if (isNaN(fee) || fee < 0) { toast.error("Xizmat narxini to'g'ri kiriting."); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      company_name: form.company_name.trim() || null,
      contact: form.contact.trim() || null,
      service_fee: fee,
    };
    if (editId) {
      const { error } = await (supabase.from("delivery_providers" as never).update(payload).eq("id", editId) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) { toast.error("Xato: " + error.message); }
      else { toast.success("Saqlandi!"); setEditId(null); }
    } else {
      const { error } = await (supabase.from("delivery_providers" as never).insert({ ...payload, is_active: true }) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) { toast.error("Xato: " + error.message); }
      else { toast.success("Qo'shildi!"); setForm(EMPTY_FORM); setShowAdd(false); }
    }
    setSaving(false);
    await load();
  }

  async function toggleActive(p: Provider) {
    await (supabase.from("delivery_providers" as never).update({ is_active: !p.is_active }).eq("id", p.id) as unknown as Promise<unknown>);
    setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
    toast.success(!p.is_active ? "Faollashtirildi." : "O'chirildi.");
  }

  async function deleteProvider(id: string) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    const { error } = await (supabase.from("delivery_providers" as never).delete().eq("id", id) as unknown as Promise<{ error: { message: string } | null }>);
    if (error) { toast.error("O'chirib bo'lmadi: " + error.message); return; }
    setProviders(prev => prev.filter(p => p.id !== id));
    toast.success("O'chirildi.");
  }

  const activeCount = providers.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Yetkazib beruvchilar</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {activeCount} faol · {providers.length} jami
          </p>
        </div>
        <Button
          onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); }}
          className="gap-2 rounded-xl bg-[#1d4f8a] text-white hover:bg-[#164078]"
        >
          <Plus className="h-4 w-4" />
          Qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Jami", value: providers.length, color: "bg-[#f0f4fa] text-[#1d4f8a]" },
          { label: "Faol", value: activeCount, color: "bg-emerald-50 text-emerald-700" },
          { label: "O'rtacha narx", value: providers.length ? formatPrice(Math.round(providers.reduce((s, p) => s + p.service_fee, 0) / providers.length)) : "—", color: "bg-violet-50 text-violet-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{s.label}</p>
            <p className="text-[22px] font-extrabold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editId) && (
        <div className="rounded-2xl border border-[#dce8f7] bg-[#f8fbff] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-neutral-900">
              {editId ? "Tahrirlash" : "Yangi yetkazib beruvchi"}
            </h3>
            <button
              onClick={() => { setShowAdd(false); setEditId(null); setForm(EMPTY_FORM); }}
              className="rounded-full p-1.5 hover:bg-neutral-100 text-neutral-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block">
                Yetkazib beruvchi nomi <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Abdullayev Jahongir"
                className="rounded-xl border-[#dce8f7]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block">Firma nomi</label>
              <Input
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Masalan: FastDelivery LLC"
                className="rounded-xl border-[#dce8f7]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block">Kontakt (telefon)</label>
              <Input
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                placeholder="+998 90 123 45 67"
                className="rounded-xl border-[#dce8f7]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block">
                Yetkazib berish narxi (so'm) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={form.service_fee}
                onChange={e => setForm(f => ({ ...f, service_fee: e.target.value }))}
                placeholder="Masalan: 15000"
                className="rounded-xl border-[#dce8f7]"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowAdd(false); setEditId(null); }}
              className="px-4 py-2 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 transition"
            >
              Bekor qilish
            </button>
            <Button
              onClick={save}
              disabled={saving}
              className="gap-2 rounded-xl bg-[#1d4f8a] text-white hover:bg-[#164078]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </div>
      )}

      {/* Providers list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#1d4f8a]" />
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#dce8f7] bg-[#f8fbff] py-16 text-center">
          <Truck className="mx-auto h-12 w-12 text-[#b8d0f0] mb-3" />
          <p className="font-semibold text-neutral-500">Hali yetkazib beruvchi yo'q</p>
          <p className="text-sm text-neutral-400 mt-1">Birinchisini qo'shing</p>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${
                p.is_active ? "border-[#dce8f7] bg-white" : "border-neutral-100 bg-neutral-50 opacity-60"
              }`}
            >
              {/* Icon */}
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.is_active ? "bg-[#f0f4fa]" : "bg-neutral-100"}`}>
                <Truck className={`h-5 w-5 ${p.is_active ? "text-[#1d4f8a]" : "text-neutral-400"}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-neutral-900 text-[15px]">{p.name}</p>
                  {p.company_name && (
                    <span className="text-[11px] font-medium text-[#1d4f8a] bg-[#f0f4fa] px-2 py-0.5 rounded-full">
                      {p.company_name}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {p.is_active ? "Faol" : "Nofaol"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-[13px] text-neutral-500 flex-wrap">
                  {p.contact && <span>📞 {p.contact}</span>}
                  <span className="font-semibold text-[#1d4f8a]">
                    {p.service_fee === 0 ? "Bepul" : formatPrice(p.service_fee)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(p)}
                  title={p.is_active ? "O'chirish" : "Faollashtirish"}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${p.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-neutral-400 hover:bg-neutral-100"}`}
                >
                  {p.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-[#f0f4fa] hover:text-[#1d4f8a] transition"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteProvider(p.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
