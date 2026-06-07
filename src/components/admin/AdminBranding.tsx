import { useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Palette, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function AdminBranding() {
  const { settings, reload } = useSiteSettings();
  const [form, setForm] = useState({
    site_name: "HammaBop",
    site_name_part1: "Hamma",
    site_name_part2: "Bop",
    brand_color: "#1d4f8a",
    brand_color2: "#EE7526",
    logo_url: "",
    tagline: "",
    support_phone: "",
    support_telegram: "",
    footer_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync from loaded settings
  useEffect(() => {
    if (settings.site_name) {
      setForm({
        site_name: settings.site_name || "HammaBop",
        site_name_part1: settings.site_name_part1 || "Hamma",
        site_name_part2: settings.site_name_part2 || "Bop",
        brand_color: settings.brand_color || "#1d4f8a",
        brand_color2: settings.brand_color2 || "#EE7526",
        logo_url: settings.logo_url || "",
        tagline: settings.tagline || "",
        support_phone: settings.support_phone || "",
        support_telegram: settings.support_telegram || "",
        footer_text: settings.footer_text || "",
      });
    }
  }, [settings.site_name]);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(form).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await reload?.();
      toast.success("Brend sozlamalari saqlandi ✓");
    } catch (e) {
      console.error(e);
      toast.error("Saqlashda xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      set("logo_url", data.publicUrl);
      toast.success("Logo yuklandi");
    } catch (e) {
      console.error(e);
      toast.error("Logo yuklashda xato");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-5 w-5 text-[#1d4f8a]" />
          <h2 className="font-bold text-neutral-900">Brend sozlamalari</h2>
        </div>

        {/* Site name */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Sayt nomi (to'liq)</label>
            <input value={form.site_name} onChange={e => set("site_name", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">1-qism (rangli)</label>
            <input value={form.site_name_part1} onChange={e => set("site_name_part1", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">2-qism</label>
            <input value={form.site_name_part2} onChange={e => set("site_name_part2", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
          <div className="flex items-end">
            <div className="rounded-xl border border-neutral-100 px-3 py-2 text-sm font-extrabold bg-neutral-50">
              <span style={{ color: form.brand_color }}>{form.site_name_part1}</span>
              <span>{form.site_name_part2}</span>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Asosiy rang</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brand_color} onChange={e => set("brand_color", e.target.value)}
                className="h-9 w-12 rounded-lg border border-neutral-200 cursor-pointer" />
              <input value={form.brand_color} onChange={e => set("brand_color", e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 px-2 py-2 text-xs font-mono focus:border-[#1d4f8a] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Ikkilamchi rang</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brand_color2} onChange={e => set("brand_color2", e.target.value)}
                className="h-9 w-12 rounded-lg border border-neutral-200 cursor-pointer" />
              <input value={form.brand_color2} onChange={e => set("brand_color2", e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 px-2 py-2 text-xs font-mono focus:border-[#1d4f8a] focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Logo</label>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-60">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Yuklash
            </button>
            <input value={form.logo_url} onChange={e => set("logo_url", e.target.value)}
              placeholder="yoki URL kiriting..."
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
          {form.logo_url && (
            <img src={form.logo_url} alt="Logo" className="mt-2 h-12 object-contain rounded" />
          )}
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Tagline / Motto</label>
          <input value={form.tagline} onChange={e => set("tagline", e.target.value)}
            placeholder="O'zbekistondagi eng qulay online bozor"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Telefon</label>
            <input value={form.support_phone} onChange={e => set("support_phone", e.target.value)}
              placeholder="+998 90 000 00 00"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Telegram</label>
            <input value={form.support_telegram} onChange={e => set("support_telegram", e.target.value)}
              placeholder="@yourbot"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
          </div>
        </div>

        {/* Footer text */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">Footer matni</label>
          <input value={form.footer_text} onChange={e => set("footer_text", e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d4f8a] py-2.5 text-sm font-semibold text-white hover:bg-[#163d6e] disabled:opacity-60 transition">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Saqlash
        </button>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Ko'rinish namunasi</p>
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: form.brand_color }}>
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
            {form.logo_url
              ? <img src={form.logo_url} className="h-full w-full object-contain" alt="" />
              : <span className="text-white font-extrabold text-xs">{(form.site_name_part1[0] || "H") + (form.site_name_part2[0] || "B")}</span>
            }
          </div>
          <div>
            <p className="font-extrabold text-white text-sm">
              <span style={{ color: form.brand_color2 }}>{form.site_name_part1}</span>
              {form.site_name_part2}
            </p>
            {form.tagline && <p className="text-white/70 text-[10px] mt-0.5">{form.tagline}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
