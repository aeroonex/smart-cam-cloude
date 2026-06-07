import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, MapPin, Phone, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/components/session-context-provider";
import { haptic } from "@/utils/haptic";
import { toast } from "sonner";

type PickupPoint = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  region: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  working_hours: string | null;
  landmark: string | null;
  is_active: boolean;
};

const REGION_COLORS: Record<string, string> = {
  "Toshkent shahri":    "#6366f1",
  "Samarqand viloyati": "#f97316",
  "Namangan viloyati":  "#10b981",
  "Andijon viloyati":   "#3b82f6",
  "Farg'ona viloyati":  "#8b5cf6",
  "Buxoro viloyati":    "#f59e0b",
};

function regionColor(r: string | null) {
  return REGION_COLORS[r ?? ""] ?? "#64748b";
}

export default function PickupPointsPage() {
  const navigate  = useNavigate();
  const { user }  = useSessionContext();
  const [points,   setPoints]   = useState<PickupPoint[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [preferred, setPreferred] = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [tab,      setTab]      = useState<"list"|"map">("list");

  useEffect(() => {
    supabase.from("pickup_points").select("*").eq("is_active", true).order("region").order("name")
      .then(({ data }) => { setPoints((data as PickupPoint[]) ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("preferred_pickup_id").eq("id", user.id).single()
      .then(({ data }) => { if (data?.preferred_pickup_id) setPreferred(data.preferred_pickup_id); });
  }, [user]);

  async function select(id: string) {
    if (!user) { toast.error("Kirish talab etiladi"); navigate("/login"); return; }
    haptic.medium();
    setSaving(id);
    await supabase.from("users").update({ preferred_pickup_id: id } as never).eq("id", user.id);
    setPreferred(id);
    setSaving(null);
    haptic.success();
    toast.success("✅ Topshirish punkti saqlandi");
  }

  function openGoogleMaps(p: PickupPoint) {
    haptic.light();
    window.open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`, "_blank", "noopener");
  }

  const filtered = points.filter(p =>
    !search || [p.name, p.address, p.city, p.region, p.landmark]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  // Group by region
  const grouped = filtered.reduce<Record<string, PickupPoint[]>>((acc, p) => {
    const key = p.region ?? "Boshqalar";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f4f6fb] pb-10">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 active:scale-95 transition-transform">
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-neutral-900 text-[17px] leading-tight">Topshirish punktlari</h1>
            <p className="text-xs text-neutral-400">{points.length} ta punkt</p>
          </div>
          {preferred && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <Star className="h-3 w-3 text-emerald-500 fill-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-600">Tanlangan</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2.5">
            <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Shahar yoki manzil bo'yicha qidiring..."
              className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none" />
            {search && <button onClick={() => setSearch("")} className="text-neutral-400 text-xs">✕</button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {(["list","map"] as const).map(t => (
            <button key={t} onClick={() => { haptic.tab(); setTab(t); }}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={tab===t
                ? { background:"#1d4f8a", color:"white" }
                : { background:"#f1f5f9", color:"#64748b" }}>
              {t==="list" ? "📋 Ro'yxat" : "🗺️ Xarita"}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAP TAB ── */}
      {tab === "map" && (
        <div className="p-4">
          <div className="rounded-2xl overflow-hidden shadow-md border border-neutral-200 mb-3" style={{ height:320 }}>
            <iframe
              title="Topshirish punktlari xaritasi"
              width="100%" height="100%" frameBorder="0" style={{ border:0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=55,37,75,43&layer=mapnik&markers=${
                points.map(p=>`${p.lat},${p.lng}`).join("|")
              }`}
            />
          </div>
          <p className="text-xs text-neutral-400 text-center">Har bir punkt uchun quyidagi ro'yxatdan "Xaritada ko'rish" tugmasini bosing</p>
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div className="px-4 pt-4 space-y-6">
          {loading ? (
            Array.from({length:3}).map((_,i) => (
              <div key={i} className="bg-white rounded-3xl p-4 animate-pulse">
                <div className="h-4 bg-neutral-100 rounded w-1/2 mb-3" />
                <div className="h-3 bg-neutral-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-100 rounded w-1/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold text-neutral-600">Topilmadi</p>
              <p className="text-sm text-neutral-400 mt-1">Boshqa kalit so'z bilan qidiring</p>
            </div>
          ) : (
            Object.entries(grouped).map(([region, pts]) => (
              <div key={region}>
                {/* Region header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ background: regionColor(region) }} />
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{region}</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400">{pts.length} ta</span>
                </div>

                <div className="space-y-3">
                  {pts.map(p => {
                    const isPreferred = preferred === p.id;
                    const isSaving    = saving === p.id;
                    const color       = regionColor(p.region);
                    return (
                      <div key={p.id}
                        className="bg-white rounded-3xl overflow-hidden shadow-sm border transition-all duration-200"
                        style={{ borderColor: isPreferred ? color : "transparent", borderWidth: isPreferred ? 2 : 1 }}>

                        {/* Top accent */}
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${color},${color}88)` }} />

                        <div className="p-4">
                          {/* Name + preferred badge */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-neutral-900 text-[15px] leading-snug flex-1">{p.name}</h3>
                            {isPreferred && (
                              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background:`${color}15`, color }}>
                                <Star className="h-2.5 w-2.5 fill-current" /> Tanlangan
                              </span>
                            )}
                          </div>

                          {/* Address */}
                          <div className="flex items-start gap-2 mb-1.5">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-neutral-400" />
                            <p className="text-sm text-neutral-600 leading-snug">{p.address}</p>
                          </div>

                          {/* Landmark */}
                          {p.landmark && (
                            <p className="text-xs text-neutral-400 mb-1.5 pl-5">📍 {p.landmark}</p>
                          )}

                          {/* Info row */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 pl-0.5">
                            {p.working_hours && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-neutral-400" />
                                <span className="text-xs text-neutral-500">{p.working_hours}</span>
                              </div>
                            )}
                            {p.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-neutral-400" />
                                <a href={`tel:${p.phone}`} className="text-xs text-blue-500 font-medium">{p.phone}</a>
                              </div>
                            )}
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-2">
                            {/* Google Maps */}
                            <button onClick={() => openGoogleMaps(p)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold border border-neutral-200 bg-neutral-50 text-neutral-600 active:scale-95 transition-transform">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                <circle cx="12" cy="9" r="2.5"/>
                              </svg>
                              Xaritada ko'rish
                            </button>

                            {/* Select */}
                            <button onClick={() => !isPreferred && select(p.id)} disabled={isSaving}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                              style={isPreferred
                                ? { background:`${color}15`, color, border:`1.5px solid ${color}40` }
                                : { background:color, color:"white" }}>
                              {isSaving ? (
                                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
                                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/>
                                </svg>
                              ) : isPreferred ? (
                                <><Check className="h-3.5 w-3.5" /> Tanlangan</>
                              ) : (
                                "Bu yerdan olaman"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
