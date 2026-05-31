import { useState } from "react";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { regions } from "@/constants";
import type { Database } from "@/integrations/supabase/types";

type Address = Database["public"]["Tables"]["user_addresses"]["Row"];

type Props = {
  addresses: Address[];
  onAdd: (addr: Omit<Address, "id" | "user_id" | "created_at">) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelect?: (addr: Address) => void;
  selectedId?: string | null;
};

export function AddressBook({ addresses, onAdd, onSetDefault, onDelete, onSelect, selectedId }: Props) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "Uy", region: "", district: "", address: "", is_default: false });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!form.region) return;
    setSaving(true);
    await onAdd(form);
    setForm({ label: "Uy", region: "", district: "", address: "", is_default: false });
    setAdding(false);
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-[#EE7526]" /> Manzillar kitobi
        </p>
        <button
          onClick={() => setAdding((o) => !o)}
          className="flex items-center gap-1 text-xs font-semibold text-[#EE7526] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Yangi manzil
        </button>
      </div>

      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => onSelect?.(addr)}
          className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition ${
            selectedId === addr.id
              ? "border-[#EE7526] bg-orange-50"
              : "border-neutral-200 bg-white hover:border-neutral-300"
          }`}
        >
          <MapPin className="h-4 w-4 text-[#EE7526] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-neutral-800">{addr.label}</p>
              {addr.is_default && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#EE7526]">
                  Asosiy
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {addr.region}{addr.district ? `, ${addr.district}` : ""}{addr.address ? `, ${addr.address}` : ""}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {!addr.is_default && (
              <button
                onClick={(e) => { e.stopPropagation(); void onSetDefault(addr.id); }}
                className="rounded-full p-1.5 hover:bg-orange-50 text-neutral-400 hover:text-[#EE7526]"
                title="Asosiy qilish"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); void onDelete(addr.id); }}
              className="rounded-full p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {addresses.length === 0 && !adding && (
        <p className="text-center py-4 text-sm text-neutral-400">Saqlangan manzil yo'q</p>
      )}

      {adding && (
        <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder='Yorliq (Uy, Ish...)'
              className="h-10 rounded-xl text-sm"
            />
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-[#EE7526]"
            >
              <option value="">Viloyat</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Input
            value={form.district}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            placeholder="Tuman (ixtiyoriy)"
            className="h-10 rounded-xl text-sm"
          />
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Ko'cha, uy, kvartira"
            className="h-10 rounded-xl text-sm"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
              className="h-4 w-4 rounded accent-[#EE7526]"
            />
            Asosiy manzil sifatida saqlash
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => void handleAdd()}
              disabled={saving || !form.region}
              className="flex-1 h-10 rounded-xl bg-[#EE7526] text-white hover:bg-[#d8661c] text-sm"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAdding(false)}
              className="h-10 rounded-xl text-sm"
            >
              Bekor
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
