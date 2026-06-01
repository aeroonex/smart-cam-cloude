import { useEffect, useState } from "react";
import {
  CheckCircle2, Copy, ExternalLink, Gift, Loader2, Megaphone,
  Plus, Send, Trash2, X, XCircle, ImageIcon, LayoutGrid, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploader } from "./MediaUploader";
import type { Database } from "@/integrations/supabase/types";

type PromoCode = Database["public"]["Tables"]["promo_codes"]["Row"];
type PromoSection = Database["public"]["Tables"]["promo_sections"]["Row"];
type Banner = Database["public"]["Tables"]["banners"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

type Tab = "promocodes" | "promos" | "banners" | "mailing";

export function AdminMarketing() {
  const [tab, setTab] = useState<Tab>("promocodes");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from("products").select("id, name").order("name")
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "promocodes" as Tab, label: "Promo kodlar", icon: Tag },
          { id: "promos" as Tab, label: "Aksiya bo'limlari", icon: LayoutGrid },
          { id: "banners" as Tab, label: "Bannerlar", icon: ImageIcon },
          { id: "mailing" as Tab, label: "Xabar yuborish", icon: Megaphone },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[#EE7526] text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "promocodes" && <PromoCodesPanel />}
      {tab === "promos" && <PromoSectionsPanel products={products} />}
      {tab === "banners" && <BannersPanel />}
      {tab === "mailing" && <MailingPanel />}
    </div>
  );
}

/* ── PROMO CODES ── */
function PromoCodesPanel() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "", discount_type: "percent" as "percent" | "fixed",
    discount_value: "", max_uses: "", expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  }

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm(f => ({ ...f, code }));
  }

  async function addCode() {
    if (!form.code.trim() || !form.discount_value) { toast.error("Kod va chegirma miqdorini kiriting."); return; }
    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    });
    setSaving(false);
    if (error) toast.error("Qo'shib bo'lmadi: " + error.message);
    else {
      toast.success("Promo kod yaratildi!");
      setForm({ code: "", discount_type: "percent", discount_value: "", max_uses: "", expires_at: "" });
      await load();
    }
  }

  async function toggleCode(id: string, cur: boolean) {
    await supabase.from("promo_codes").update({ is_active: !cur }).eq("id", id);
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: !cur } : c));
  }

  async function deleteCode(id: string) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    setCodes(prev => prev.filter(c => c.id !== id));
    toast.success("O'chirildi.");
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900">
          <Gift className="h-5 w-5 text-[#EE7526]" />Yangi promo kod
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kod *</label>
            <div className="flex gap-2">
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20" className="rounded-xl font-mono" />
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={generateCode}>
                Auto
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Chegirma turi</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, discount_type: "percent" }))}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                  form.discount_type === "percent" ? "border-[#EE7526] bg-orange-50 text-[#EE7526]" : "border-neutral-200 text-neutral-500"
                }`}
              >
                Foiz (%)
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, discount_type: "fixed" }))}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                  form.discount_type === "fixed" ? "border-[#EE7526] bg-orange-50 text-[#EE7526]" : "border-neutral-200 text-neutral-500"
                }`}
              >
                Summa (so'm)
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Miqdor {form.discount_type === "percent" ? "(%)" : "(so'm)"} *
            </label>
            <Input type="number" value={form.discount_value}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
              placeholder={form.discount_type === "percent" ? "20" : "50000"} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Maks foydalanish</label>
            <Input type="number" value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="100 (cheksiz = bo'sh)" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Muddati tugash sanasi</label>
            <Input type="datetime-local" value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="rounded-xl" />
          </div>
        </div>
        <Button onClick={() => void addCode()} disabled={saving}
          className="mt-4 rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Kod yaratish
        </Button>
      </div>

      {/* Codes list */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl bg-white border border-neutral-100 py-12 text-center text-neutral-400">
          Hali promo kod yaratilmagan
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Kod</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Chegirma</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Foydalanish</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Muddat</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-400">Holat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {codes.map(c => (
                <tr key={c.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-neutral-900">{c.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Nusxalandi!"); }}
                        className="text-neutral-400 hover:text-[#EE7526]">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#EE7526]">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()} so'm`}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("uz-UZ") : "Cheksiz"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => void toggleCode(c.id, c.is_active)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                      }`}>
                      {c.is_active ? "Aktiv" : "Nofaol"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => void deleteCode(c.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── PROMO SECTIONS ── */
function PromoSectionsPanel({ products }: { products: Product[] }) {
  const [sections, setSections] = useState<PromoSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", bg_color: "#2563EB", text_color: "#ffffff", end_time: "", product_ids: "" });
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("promo_sections").select("*").order("sort_order");
    setSections(data ?? []);
    setLoading(false);
  }

  async function add() {
    if (!form.title.trim()) { toast.error("Sarlavhani kiriting."); return; }
    setSaving(true);
    const ids = form.product_ids.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const resolved = ids.map(idOrName => {
      if (/^[0-9a-f-]{36}$/i.test(idOrName)) return idOrName;
      return products.find(p => p.name.toLowerCase().includes(idOrName.toLowerCase()))?.id ?? idOrName;
    }).filter(Boolean);

    const { error } = await supabase.from("promo_sections").insert({
      title: form.title.trim(),
      bg_color: form.bg_color,
      text_color: form.text_color,
      end_time: form.end_time || null,
      product_ids: resolved,
      sort_order: sections.length,
    });
    setSaving(false);
    if (error) toast.error("Xato: " + error.message);
    else {
      toast.success("Aksiya bo'limi qo'shildi!");
      setForm({ title: "", bg_color: "#2563EB", text_color: "#ffffff", end_time: "", product_ids: "" });
      await load();
    }
  }

  async function toggle(id: string, cur: boolean) {
    await supabase.from("promo_sections").update({ is_active: !cur }).eq("id", id);
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !cur } : s));
  }

  async function del(id: string) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("promo_sections").delete().eq("id", id);
    setSections(prev => prev.filter(s => s.id !== id));
    toast.success("O'chirildi.");
  }

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-neutral-900">Yangi aksiya bo'limi</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sarlavha *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Yozgi chegirma" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tugash vaqti</label>
            <Input type="datetime-local" value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Fon rangi</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.bg_color}
                onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border" />
              <div className="flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: form.bg_color, color: form.text_color }}>
                {form.title || "Sarlavha"}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Matn rangi</label>
            <input type="color" value={form.text_color}
              onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))}
              className="h-10 w-14 cursor-pointer rounded-lg border" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Mahsulotlar</label>
            <Input placeholder="Qidirish..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
              className="rounded-xl mb-2" />
            <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50">
              {filteredProducts.slice(0, 20).map(p => (
                <button key={p.id} className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-orange-50 transition text-left"
                  onClick={() => setForm(f => ({ ...f, product_ids: f.product_ids ? f.product_ids + "\n" + p.id : p.id }))}>
                  <span className="truncate text-neutral-700">{p.name}</span>
                  <span className="ml-2 shrink-0 text-[#EE7526] font-semibold">+ Qo'shish</span>
                </button>
              ))}
            </div>
            <Textarea value={form.product_ids}
              onChange={e => setForm(f => ({ ...f, product_ids: e.target.value }))}
              placeholder="Yoki mahsulot ID larini kiriting (har birini yangi qatorda)"
              className="rounded-xl text-xs mt-2" rows={3} />
          </div>
        </div>
        <Button onClick={() => void add()} disabled={saving}
          className="mt-4 rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>
      ) : (
        <div className="space-y-3">
          {sections.map(s => {
            const sProds = products.filter(p => s.product_ids.includes(p.id));
            return (
              <div key={s.id} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg shrink-0" style={{ background: s.bg_color }} />
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900">{s.title}</p>
                    <p className="text-xs text-neutral-400">{sProds.length} mahsulot{s.end_time ? ` · ${new Date(s.end_time).toLocaleString("uz-UZ")}` : ""}</p>
                  </div>
                  <button onClick={() => void toggle(s.id, s.is_active)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}>
                    {s.is_active ? "Aktiv" : "Yashirin"}
                  </button>
                  <button onClick={() => void del(s.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {sections.length === 0 && <p className="text-center text-neutral-400 py-8">Bo'lim yo'q</p>}
        </div>
      )}
    </div>
  );
}

/* ── BANNERS ── */
function BannersPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ image: "", link: "", title: "", subtitle: "", badge: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(data ?? []);
    setLoading(false);
  }

  async function add() {
    if (!form.image.trim()) { toast.error("Banner rasmini kiriting."); return; }
    setSaving(true);
    const { error } = await supabase.from("banners").insert({
      image_url: form.image.trim(),
      link_url: form.link.trim() || null,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      badge: form.badge.trim() || null,
      sort_order: banners.length,
    });
    setSaving(false);
    if (error) toast.error("Xato: " + error.message);
    else { toast.success("Banner qo'shildi!"); setForm({ image: "", link: "", title: "", subtitle: "", badge: "" }); await load(); }
  }

  async function toggle(id: string, cur: boolean) {
    await supabase.from("banners").update({ is_active: !cur }).eq("id", id);
    setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !cur } : b));
  }

  async function del(id: string) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("banners").delete().eq("id", id);
    setBanners(prev => prev.filter(b => b.id !== id));
    toast.success("O'chirildi.");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900">
          <ImageIcon className="h-5 w-5 text-[#EE7526]" />Yangi banner
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rasm yuklash</label>
            <MediaUploader onAdd={url => setForm(f => ({ ...f, image: url }))} />
            {form.image && (
              <div className="relative mt-2 overflow-hidden rounded-xl">
                <img src={form.image} alt="" className="h-28 w-full object-cover"
                  onError={e => { e.currentTarget.style.display = "none"; }} />
                <button onClick={() => setForm(f => ({ ...f, image: "" }))}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <Input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              placeholder="Yoki rasm URL manzilini kiriting" className="rounded-xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Havola</label>
              <Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="/product/123 yoki URL" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Badge</label>
              <Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                placeholder="KATTA CHEGIRMA" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sarlavha</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="SPORT MAVSUMI" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tavsif</label>
              <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="Eng yaxshi narxlarda" className="rounded-xl" />
            </div>
          </div>
        </div>
        <Button onClick={() => void add()} disabled={saving}
          className="mt-4 rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Banner qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
              <img src={b.image_url} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover border border-neutral-100"
                onError={e => { e.currentTarget.style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{b.title || "(sarlavhasiz)"}</p>
                {b.link_url && (
                  <a href={b.link_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#EE7526] hover:underline truncate">
                    <ExternalLink className="h-3 w-3 shrink-0" />{b.link_url}
                  </a>
                )}
              </div>
              <button onClick={() => void toggle(b.id, b.is_active)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                }`}>
                {b.is_active ? "Aktiv" : "Nofaol"}
              </button>
              <button onClick={() => void del(b.id)} className="shrink-0 text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {banners.length === 0 && <p className="text-center text-neutral-400 py-8">Banner yo'q</p>}
        </div>
      )}
    </div>
  );
}

/* ── MAILING ── */
function MailingPanel() {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [abandonedEnabled, setAbandonedEnabled] = useState(
    () => localStorage.getItem("hb_abandoned_cart") === "true"
  );
  const [abandonedMsg, setAbandonedMsg] = useState(
    () => localStorage.getItem("hb_abandoned_msg") ?? "Savatchangizda mahsulot qoldi! Buyurtma bering — siz uchun bron qilindi 🛒"
  );

  async function sendMass() {
    if (!message.trim()) { toast.error("Xabar matnini kiriting."); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("telegram-bot", {
        body: { type: "broadcast", message: message.trim(), image_url: imageUrl.trim() || undefined },
      });
      if (error) throw error;
      toast.success("Xabar yuborildi!");
      setMessage("");
      setImageUrl("");
    } catch {
      toast.error("Yuborib bo'lmadi. Edge function ishga tushirilganini tekshiring.");
    } finally {
      setSending(false);
    }
  }

  function saveAbandonedSettings() {
    localStorage.setItem("hb_abandoned_cart", String(abandonedEnabled));
    localStorage.setItem("hb_abandoned_msg", abandonedMsg);
    toast.success("Sozlamalar saqlandi!");
  }

  return (
    <div className="space-y-5">
      {/* Mass message */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-neutral-900">
          <Send className="h-5 w-5 text-[#EE7526]" />Ommaviy xabar (Telegram)
        </h3>
        <p className="mb-4 text-xs text-neutral-400">Barcha Telegram foydalanuvchilarga xabar yuborish</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Xabar matni *</label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Xabar matnini kiriting... HTML formatda bo'lishi mumkin" rows={4}
              className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rasm URL (ixtiyoriy)</label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://... rasm URL" className="rounded-xl" />
          </div>
          <Button onClick={() => void sendMass()} disabled={sending}
            className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Yuborish
          </Button>
        </div>
      </div>

      {/* Abandoned cart */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-neutral-900">Tashlab ketilgan savat eslatmasi</h3>
            <p className="text-xs text-neutral-400">2 soatdan keyin avtomatik Telegram xabari yuboriladi</p>
          </div>
          <button
            onClick={() => setAbandonedEnabled(v => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${abandonedEnabled ? "bg-[#EE7526]" : "bg-neutral-200"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${abandonedEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Eslatma xabari</label>
            <Textarea value={abandonedMsg} onChange={e => setAbandonedMsg(e.target.value)}
              rows={3} className="rounded-xl" />
          </div>
          <p className="text-xs text-neutral-400">
            💡 Xabarda mahsulot rasmi va "Sotib olish" tugmasi avtomatik qo'shiladi
          </p>
          <Button onClick={saveAbandonedSettings} variant="outline" className="rounded-full border-orange-200 text-[#EE7526]">
            Sozlamalarni saqlash
          </Button>
        </div>
      </div>

      {/* UTM generator */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-bold text-neutral-900">UTM Link Generator</h3>
        <p className="mb-4 text-xs text-neutral-400">Target reklama uchun kuzatuv havolasi yaratish</p>
        <UTMGenerator />
      </div>
    </div>
  );
}

function UTMGenerator() {
  const [baseUrl, setBaseUrl] = useState("https://hammabop.uz");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("telegram");
  const [campaign, setCampaign] = useState("");

  const utmUrl = baseUrl && source && campaign
    ? `${baseUrl}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`
    : "";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Asosiy URL</label>
          <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://hammabop.uz" className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Manba (utm_source)</label>
          <Input value={source} onChange={e => setSource(e.target.value)} placeholder="instagram, tiktok" className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kanal (utm_medium)</label>
          <Input value={medium} onChange={e => setMedium(e.target.value)} placeholder="telegram, story" className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kampaniya (utm_campaign)</label>
          <Input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="summer-sale-2026" className="rounded-xl" />
        </div>
      </div>
      {utmUrl && (
        <div className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2">
          <p className="flex-1 truncate text-xs font-mono text-neutral-700">{utmUrl}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(utmUrl); toast.success("Nusxalandi!"); }}
            className="shrink-0 rounded-lg bg-[#EE7526] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Copy className="inline h-3 w-3 mr-1" />Nusxa
          </button>
        </div>
      )}
    </div>
  );
}
