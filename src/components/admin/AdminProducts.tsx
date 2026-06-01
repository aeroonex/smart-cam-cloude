import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Edit3, ExternalLink, Loader2, Package,
  PackagePlus, Plus, RefreshCw, Search, Star, Trash2,
  Upload, X, XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { MediaUploader, MediaPreviewList } from "./MediaUploader";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  store_id?: string | null;
  store_name?: string | null;
  discount_percent?: number | null;
  original_price?: number | null;
};

type Store = { id: string; name: string; commission_percent: number };

const CATEGORIES = [
  "Mobil telefonlar", "Kompyuter & Noutbuk", "Kiyim-kechak", "Poyabzal",
  "Uy va ofis", "Avtomobil", "Bolalar tovarlari", "O'yinlar & Hobby",
  "Sport & Sog'liq", "Soatlar & Zargarlik", "Sumkalar", "Asbob-uskuna",
  "Go'zallik & Parfyumeriya", "Kameralar va xavfsizlik",
];

// Predefined spec keys by category
const SPEC_PRESETS: Record<string, string[]> = {
  default: ["Rang", "O'lcham", "Material", "Og'irligi", "Ishlab chiqaruvchi", "Kafolat"],
  "Kiyim-kechak": ["Rang", "O'lcham", "Material", "Yosh", "Jinsi", "Mavsumi"],
  "Poyabzal": ["Rang", "Razmer", "Material", "Jinsi", "Yosh"],
  "Mobil telefonlar": ["Rang", "Xotira", "RAM", "Batareya", "Ekran", "Kamera", "OS"],
  "Kompyuter & Noutbuk": ["Protsessor", "RAM", "Xotira", "Ekran", "OS", "Videokarta", "Og'irligi"],
  "Kameralar va xavfsizlik": ["Rezolutsiya", "Turi", "Ulanish", "Qo'llash", "IP himoya", "Ovoz", "Gechacha ko'rish"],
  "Soatlar & Zargarlik": ["Rang", "Material", "Suv himoyasi", "Batareya", "Funksiya"],
  "Sport & Sog'liq": ["Rang", "O'lcham", "Material", "Yosh", "Og'irligi"],
};

type PForm = {
  name: string; description: string; price: string; discount_percent: string;
  stock_count: string; images: string; category: string; store_id: string;
  warranty: string; specs: SpecEntry[];
};

type SpecEntry = { key: string; value: string };

const EMPTY: PForm = {
  name: "", description: "", price: "", discount_percent: "",
  stock_count: "", images: "", category: "", store_id: "", warranty: "", specs: [],
};

type BulkRow = { name: string; price: number; category: string; description: string };

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [addForm, setAddForm] = useState<PForm>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkRow[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [priceUpdatePct, setPriceUpdatePct] = useState("");
  const [priceUpdateCat, setPriceUpdateCat] = useState("");
  const [priceUpdating, setPriceUpdating] = useState(false);
  const bulkRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [prodRes, storeRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      (supabase.from("stores" as never).select("id, name, commission_percent") as unknown as Promise<{ data: Store[] | null }>),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setStores(storeRes.data ?? []);
    setLoading(false);
  }

  function specsToObject(specs: SpecEntry[]): Record<string, string> | null {
    const obj: Record<string, string> = {};
    specs.forEach(s => { if (s.key.trim() && s.value.trim()) obj[s.key.trim()] = s.value.trim(); });
    return Object.keys(obj).length ? obj : null;
  }

  function objectToSpecs(obj: Record<string, string> | null): SpecEntry[] {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  function parseImages(raw: string) {
    return raw.split("\n").map(s => s.trim()).filter(Boolean);
  }

  async function addProduct() {
    if (!addForm.name.trim() || !addForm.price) { toast.error("Nom va narxni kiriting."); return; }
    setSaving(true);
    const discPct = Number(addForm.discount_percent) || 0;
    const origPrice = Number(addForm.price);
    const store = stores.find(s => s.id === addForm.store_id);
    const { error } = await supabase.from("products").insert({
      name: addForm.name.trim(),
      description: addForm.description.trim() || null,
      price: discPct > 0 ? Math.round(origPrice * (1 - discPct / 100)) : origPrice,
      original_price: discPct > 0 ? origPrice : null,
      discount_percent: discPct || null,
      stock_count: Number(addForm.stock_count) || 0,
      images: parseImages(addForm.images),
      category: addForm.category || null,
      specifications: specsToObject(addForm.specs),
      store_id: addForm.store_id || null,
      store_name: store?.name ?? null,
      warranty: addForm.warranty.trim() || null,
      status: "active",
    } as Record<string, unknown>);
    setSaving(false);
    if (error) toast.error("Qo'shib bo'lmadi: " + error.message);
    else { toast.success("Mahsulot qo'shildi!"); setAddForm(EMPTY); setShowAdd(false); await load(); }
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    const discPct = Number(editForm.discount_percent) || 0;
    const origPrice = Number(editForm.price);
    const store = stores.find(s => s.id === editForm.store_id);
    const { error } = await supabase.from("products").update({
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      price: discPct > 0 ? Math.round(origPrice * (1 - discPct / 100)) : origPrice,
      original_price: discPct > 0 ? origPrice : null,
      discount_percent: discPct || null,
      stock_count: Number(editForm.stock_count) || 0,
      images: parseImages(editForm.images),
      category: editForm.category || null,
      specifications: specsToObject(editForm.specs),
      store_id: editForm.store_id || null,
      store_name: store?.name ?? null,
      warranty: editForm.warranty.trim() || null,
    } as Record<string, unknown>).eq("id", editId);
    setSaving(false);
    if (error) toast.error("Saqlashda xato.");
    else { toast.success("Saqlandi!"); setEditId(null); await load(); }
  }

  async function toggleStock(id: string, cur: Product["status"]) {
    const next = cur === "active" ? "inactive" : "active";
    await supabase.from("products").update({ status: next }).eq("id", id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: next } : p));
    toast.success(next === "active" ? "Faollashtirildi." : "Yashirildi. («Tugab qoldi» ko'rinadi)");
  }

  async function toggleRecommended(id: string, cur: boolean) {
    await supabase.from("products").update({ is_recommended: !cur }).eq("id", id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_recommended: !cur } : p));
    toast.success(!cur ? "Tavsiyaga qo'shildi." : "Tavsiyadan olib tashlandi.");
  }

  async function deleteProduct(id: string) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success("O'chirildi.");
  }

  function handleBulkFile(files: FileList | null) {
    if (!files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows: BulkRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const name = cols[0]?.trim();
        const price = Number(cols[1]?.trim());
        if (name && price > 0) rows.push({ name, price, category: cols[2]?.trim() ?? "", description: cols[3]?.trim() ?? "" });
      }
      if (!rows.length) { toast.error("CSV format noto'g'ri yoki bo'sh."); return; }
      setBulkPreview(rows);
    };
    reader.readAsText(files[0]);
  }

  async function confirmBulkUpload() {
    setBulkSaving(true);
    const { error } = await supabase.from("products").insert(
      bulkPreview.map(r => ({ name: r.name, price: r.price, category: r.category || null, description: r.description || null, status: "active" as const, images: [] }))
    );
    setBulkSaving(false);
    if (error) { toast.error("Yuklashda xato: " + error.message); return; }
    toast.success(`${bulkPreview.length} ta mahsulot yuklandi!`);
    setBulkPreview([]);
    await load();
  }

  async function applyPriceUpdate() {
    const pct = Number(priceUpdatePct);
    if (!pct || Math.abs(pct) > 90) { toast.error("Foizni to'g'ri kiriting (-90 dan 90 gacha)."); return; }
    setPriceUpdating(true);
    let q = supabase.from("products").select("id, price");
    if (priceUpdateCat) q = q.eq("category", priceUpdateCat) as typeof q;
    const { data } = await q;
    if (!data?.length) { toast.error("Mahsulot topilmadi."); setPriceUpdating(false); return; }
    for (const p of data) {
      await supabase.from("products").update({ price: Math.round(Number(p.price) * (1 + pct / 100)) }).eq("id", p.id);
    }
    setPriceUpdating(false);
    toast.success(`${data.length} ta mahsulot narxi ${pct > 0 ? "+" : ""}${pct}% o'zgardi.`);
    await load();
  }

  function startEdit(p: Product) {
    setEditForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.original_price ?? p.price),
      discount_percent: String(p.discount_percent ?? ""),
      stock_count: String(p.stock_count ?? 0),
      images: (p.images ?? []).join("\n"),
      category: p.category ?? "",
      store_id: p.store_id ?? "",
      warranty: (p as unknown as { warranty?: string }).warranty ?? "",
      specs: objectToSpecs(p.specifications as Record<string, string> | null),
    });
    setEditId(p.id);
  }

  const displayed = products.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchCat = !catFilter || p.category === catFilter;
    return matchQ && matchCat;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input placeholder="Mahsulot qidirish..."
              className="pl-9 h-9 w-full rounded-xl"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none shrink-0 max-w-[160px]">
            <option value="">Barcha kat.</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
            onClick={() => bulkRef.current?.click()}>
            <Upload className="h-4 w-4" /><span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <input ref={bulkRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => handleBulkFile(e.target.files)} />
          <Button size="sm" className="rounded-xl gap-1.5 bg-[#EE7526] text-white hover:bg-[#d8661c]"
            onClick={() => setShowAdd(v => !v)}>
            <Plus className="h-4 w-4" />{showAdd ? "Yopish" : "Yangi mahsulot"}
          </Button>
        </div>
      </div>

      {/* Bulk preview */}
      {bulkPreview.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-blue-800">{bulkPreview.length} ta mahsulot tayyor</p>
            <button onClick={() => setBulkPreview([])}><X className="h-4 w-4 text-blue-500" /></button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-xl bg-white text-sm divide-y">
            {bulkPreview.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <span className="font-medium">{r.name}</span>
                <span className="text-[#EE7526] font-semibold">{formatPrice(r.price)}</span>
              </div>
            ))}
          </div>
          <Button onClick={confirmBulkUpload} disabled={bulkSaving}
            className="mt-3 rounded-xl bg-[#EE7526] text-white hover:bg-[#d8661c]">
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Yuklashni tasdiqlash
          </Button>
        </div>
      )}

      {/* Dynamic price update */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Narxlarni dynamic yangilash</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <select value={priceUpdateCat} onChange={e => setPriceUpdateCat(e.target.value)}
            className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none w-full sm:w-auto">
            <option value="">Barcha kategoriyalar</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="+10 yoki -5 (%)" value={priceUpdatePct}
            onChange={e => setPriceUpdatePct(e.target.value)} className="h-9 w-full sm:w-36 rounded-xl" />
          <Button onClick={applyPriceUpdate} disabled={priceUpdating}
            variant="outline" className="h-9 rounded-xl border-orange-200 text-[#EE7526] w-full sm:w-auto">
            {priceUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Yangilash
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900">
            <PackagePlus className="h-5 w-5 text-[#EE7526]" />Yangi mahsulot
          </h3>
          <ProductFormFields form={addForm} setForm={setAddForm} stores={stores} />
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void addProduct()} disabled={saving}
              className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Qo'shish
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-full">Bekor</Button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" style={{ maxHeight: "90vh" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-neutral-900">
                <Edit3 className="h-5 w-5 text-[#EE7526]" />Tahrirlash
              </h2>
              <button onClick={() => setEditId(null)} className="rounded-full p-1.5 hover:bg-neutral-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProductFormFields form={editForm} setForm={setEditForm} stores={stores} />
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void saveEdit()} disabled={saving}
                className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Saqlash
              </Button>
              <Button variant="ghost" onClick={() => setEditId(null)} className="rounded-full">Bekor</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <span>Jami: <b className="text-neutral-800">{products.length}</b></span>
        <span>Faol: <b className="text-emerald-600">{products.filter(p => p.status === "active").length}</b></span>
        <span>Yashirin: <b className="text-red-500">{products.filter(p => p.status !== "active").length}</b></span>
        <span>Ko'rsatilgan: <b className="text-neutral-800">{displayed.length}</b></span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayed.map(p => (
            <div key={p.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
              p.status !== "active" ? "border-red-100 opacity-70" : "border-neutral-100"
            }`}>
              <div className="relative">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-40 w-full object-cover"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-orange-50">
                    <Package className="h-10 w-10 text-orange-200" />
                  </div>
                )}
                {p.status !== "active" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">Tugab qoldi</span>
                  </div>
                )}
                {p.is_recommended && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#EE7526] px-2 py-0.5 text-[10px] font-bold text-white">
                    <Star className="h-2.5 w-2.5 fill-white" />Tavsiya
                  </span>
                )}
                {p.discount_percent && (
                  <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    -{p.discount_percent}%
                  </span>
                )}
              </div>

              <div className="p-4">
                {/* Store badge */}
                {p.store_name && (
                  <span className="mb-1 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">
                    🏪 {p.store_name}
                  </span>
                )}
                {p.category && (
                  <span className="mb-1.5 ml-1 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-medium text-[#EE7526]">
                    {p.category}
                  </span>
                )}
                <p className="font-bold text-neutral-900 line-clamp-2 text-sm">{p.name}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <p className="font-semibold text-[#EE7526]">{formatPrice(Number(p.price))}</p>
                  {p.original_price && (
                    <p className="text-xs text-neutral-400 line-through">{formatPrice(Number(p.original_price))}</p>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400">{p.sold_count} ta sotildi</p>
                <p className={`text-[10px] font-semibold ${p.stock_count === 0 ? "text-red-500" : p.stock_count <= 5 ? "text-amber-500" : "text-emerald-600"}`}>
                  {p.stock_count === 0 ? "Tugagan" : p.stock_count <= 5 ? `⚠ ${p.stock_count} ta qoldi` : `✓ ${p.stock_count} ta omborda`}
                </p>

                <div className="mt-3 space-y-2">
                  <button onClick={() => void toggleStock(p.id, p.status)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-semibold transition ${
                      p.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    }`}>
                    {p.status === "active"
                      ? <><CheckCircle2 className="h-3.5 w-3.5" />Faol — Yashirish</>
                      : <><XCircle className="h-3.5 w-3.5" />Yashirin — Faollashtirish</>}
                  </button>
                  <button onClick={() => void toggleRecommended(p.id, p.is_recommended)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-semibold transition ${
                      p.is_recommended
                        ? "border-[#EE7526] bg-orange-50 text-[#EE7526]"
                        : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}>
                    <Star className={`h-3.5 w-3.5 ${p.is_recommended ? "fill-[#EE7526]" : ""}`} />
                    {p.is_recommended ? "Tavsiyada" : "Tavsiyaga qo'shish"}
                  </button>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEdit(p)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-blue-50 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition">
                      <Edit3 className="h-3.5 w-3.5" />Tahrir
                    </button>
                    <Link to={`/product/${p.id}`} target="_blank"
                      className="flex items-center justify-center rounded-full bg-neutral-100 px-2.5 text-neutral-500 hover:bg-neutral-200 transition">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => void deleteProduct(p.id)}
                      className="flex items-center justify-center rounded-full bg-red-50 px-2.5 text-red-500 hover:bg-red-100 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && displayed.length === 0 && (
        <div className="rounded-2xl bg-white border border-neutral-100 py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="text-neutral-400">Mahsulot topilmadi</p>
        </div>
      )}
    </div>
  );
}

/* ── Product Form with store + tag-based specs ── */
function ProductFormFields({
  form, setForm, stores,
}: {
  form: PForm;
  setForm: React.Dispatch<React.SetStateAction<PForm>>;
  stores: Store[];
}) {
  const presetKeys = SPEC_PRESETS[form.category] ?? SPEC_PRESETS.default;
  const mediaUrls = form.images.split("\n").map(s => s.trim()).filter(Boolean);

  function addSpec(key: string) {
    if (form.specs.some(s => s.key === key)) return;
    setForm(f => ({ ...f, specs: [...f.specs, { key, value: "" }] }));
  }

  function removeSpec(i: number) {
    setForm(f => ({ ...f, specs: f.specs.filter((_, j) => j !== i) }));
  }

  function updateSpec(i: number, field: "key" | "value", val: string) {
    setForm(f => ({
      ...f,
      specs: f.specs.map((s, j) => j === i ? { ...s, [field]: val } : s),
    }));
  }

  function addCustomSpec() {
    setForm(f => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Nomi *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Mahsulot nomi" className="rounded-xl" />
        </div>
        {/* Price */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Narxi (so'm) *</label>
          <Input type="number" value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="150000" className="rounded-xl" />
        </div>
        {/* Discount */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Chegirma % (ixtiyoriy)</label>
          <Input type="number" value={form.discount_percent}
            onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
            placeholder="20" className="rounded-xl" />
          {form.discount_percent && form.price && (
            <p className="text-xs text-emerald-600">
              Chegirmali narx: {formatPrice(Math.round(Number(form.price) * (1 - Number(form.discount_percent) / 100)))}
            </p>
          )}
        </div>
        {/* Stock count */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ombordagi miqdor (dona) *</label>
          <Input type="number" min="0" value={form.stock_count}
            onChange={e => setForm(f => ({ ...f, stock_count: e.target.value }))}
            placeholder="100" className="rounded-xl" />
          {form.stock_count !== "" && (
            <p className={`text-xs font-medium ${Number(form.stock_count) === 0 ? "text-red-500" : Number(form.stock_count) <= 5 ? "text-amber-500" : "text-emerald-600"}`}>
              {Number(form.stock_count) === 0 ? "⚠ Tugagan — xaridorga «Tugadi» ko'rinadi" : Number(form.stock_count) <= 5 ? `⚠ Faqat ${form.stock_count} ta qoldi` : `✓ ${form.stock_count} ta mavjud`}
            </p>
          )}
        </div>
        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kategoriya</label>
          <select value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value, specs: [] }))}
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#EE7526]/30">
            <option value="">— Tanlang —</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {/* Store */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Do'kon / Hamkor</label>
          <select value={form.store_id}
            onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#EE7526]/30">
            <option value="">— Do'kon tanlanmagan —</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.commission_percent}% komissiya)</option>
            ))}
          </select>
          {stores.length === 0 && (
            <p className="text-xs text-neutral-400">Hamkorlar bo'limidan do'kon qo'shing</p>
          )}
        </div>
        {/* Warranty */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kafolat muddati</label>
          <select value={form.warranty}
            onChange={e => setForm(f => ({ ...f, warranty: e.target.value }))}
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#EE7526]/30">
            <option value="">— Kafolat yo'q —</option>
            <option value="6 oy">6 oy</option>
            <option value="12 oy">12 oy</option>
            <option value="18 oy">18 oy</option>
            <option value="24 oy">24 oy</option>
            <option value="36 oy">36 oy</option>
          </select>
        </div>
        {/* Description */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tavsif</label>
          <Textarea value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mahsulot tavsifi..." className="rounded-xl" rows={2} />
        </div>
      </div>

      {/* ── SPECS ── Tag-based */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Xususiyatlar (Texnik parametrlar)
          </label>
          <button onClick={addCustomSpec}
            className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition">
            <Plus className="h-3 w-3" />Qo'lda qo'shish
          </button>
        </div>

        {/* Preset tag buttons */}
        {presetKeys.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] text-neutral-400">
              {form.category ? `"${form.category}" uchun tayyor parametrlar:` : "Umumiy parametrlar:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presetKeys.map(key => {
                const already = form.specs.some(s => s.key === key);
                return (
                  <button
                    key={key}
                    onClick={() => already ? removeSpec(form.specs.findIndex(s => s.key === key)) : addSpec(key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      already
                        ? "border-[#EE7526] bg-orange-50 text-[#EE7526]"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-[#EE7526] hover:text-[#EE7526]"
                    }`}
                  >
                    {already ? <><span className="mr-1">✓</span>{key}</> : <><span className="mr-1">+</span>{key}</>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Spec rows */}
        {form.specs.length > 0 && (
          <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            {form.specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={spec.key}
                  onChange={e => updateSpec(i, "key", e.target.value)}
                  placeholder="Xususiyat nomi"
                  className="h-8 w-36 shrink-0 rounded-lg text-xs"
                />
                <span className="text-neutral-400">:</span>
                <Input
                  value={spec.value}
                  onChange={e => updateSpec(i, "value", e.target.value)}
                  placeholder="Qiymati (masalan: Qora, XL, 128GB)"
                  className="h-8 flex-1 rounded-lg text-xs"
                />
                <button onClick={() => removeSpec(i)}
                  className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {form.specs.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-neutral-200 py-4 text-center text-xs text-neutral-400">
            Yuqoridagi tugmalardan parametr tanlang yoki "Qo'lda qo'shish" tugmasini bosing
          </div>
        )}
      </div>

      {/* Media */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Media (rasm/video)</label>
        <MediaUploader onAdd={url => setForm(f => ({ ...f, images: f.images ? f.images + "\n" + url : url }))} />
        <MediaPreviewList
          urls={mediaUrls}
          onRemove={i => setForm(f => ({ ...f, images: mediaUrls.filter((_, j) => j !== i).join("\n") }))}
        />
        <Textarea value={form.images}
          onChange={e => setForm(f => ({ ...f, images: e.target.value }))}
          placeholder="Yoki URL manzillarini kiriting (har biri yangi qatorda)"
          className="rounded-xl text-xs" rows={2} />
      </div>
    </div>
  );
}

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}
