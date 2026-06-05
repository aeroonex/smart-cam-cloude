import { useEffect, useState, useRef } from "react";
import { MapPin, Plus, Trash2, Edit3, Check, X, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type PickupPoint = {
  id: string; name: string; address: string;
  lat: number; lng: number; working_hours: string;
  phone: string | null; is_active: boolean;
};

const TASHKENT: [number, number] = [41.2995, 69.2401];
const EMPTY = { name: "", address: "", working_hours: "09:00–18:00", phone: "" };

export function AdminPickupPoints() {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pendingMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase.from("pickup_points" as never).select("*").order("created_at") as unknown as Promise<{ data: PickupPoint[] | null }>);
    setPoints(data ?? []);
    setLoading(false);
  }

  // Init admin map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: TASHKENT, zoom: 12, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      setPendingLat(e.latlng.lat);
      setPendingLng(e.latlng.lng);

      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.setLatLng(e.latlng);
      } else {
        pendingMarkerRef.current = L.marker(e.latlng, {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
            iconSize: [28, 28], iconAnchor: [14, 14],
          })
        }).addTo(map).bindPopup("Yangi nuqta").openPopup();
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Render existing markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    points.filter(p => p.is_active).forEach(p => {
      const m = L.marker([p.lat, p.lng])
        .addTo(map)
        .bindPopup(`<b>${p.name}</b><br/><small>${p.address}</small>`);
      markersRef.current.push(m);
    });
  }, [points]);

  function startAdd() {
    setEditId(null);
    setForm(EMPTY);
    setPendingLat(null);
    setPendingLng(null);
    if (pendingMarkerRef.current) { pendingMarkerRef.current.remove(); pendingMarkerRef.current = null; }
    setShowForm(true);
    setTimeout(() => mapRef.current?.invalidateSize(), 100);
  }

  function startEdit(p: PickupPoint) {
    setEditId(p.id);
    setForm({ name: p.name, address: p.address, working_hours: p.working_hours, phone: p.phone ?? "" });
    setPendingLat(p.lat);
    setPendingLng(p.lng);
    setShowForm(true);
    setTimeout(() => {
      mapRef.current?.invalidateSize();
      mapRef.current?.setView([p.lat, p.lng], 15);
      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.setLatLng([p.lat, p.lng]);
      } else {
        pendingMarkerRef.current = L.marker([p.lat, p.lng]).addTo(mapRef.current!);
      }
    }, 100);
  }

  async function save() {
    if (!form.name.trim() || !form.address.trim()) { toast.error("Nom va manzilni kiriting"); return; }
    if (!pendingLat || !pendingLng) { toast.error("Xaritada joylashuvni belgilang"); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      lat: pendingLat, lng: pendingLng,
      working_hours: form.working_hours || "09:00–18:00",
      phone: form.phone.trim() || null,
      is_active: true,
    };

    if (editId) {
      await (supabase.from("pickup_points" as never).update(payload).eq("id", editId) as unknown as Promise<unknown>);
      toast.success("Yangilandi");
    } else {
      await (supabase.from("pickup_points" as never).insert(payload) as unknown as Promise<unknown>);
      toast.success("Qo'shildi");
    }

    setSaving(false);
    setShowForm(false);
    setEditId(null);
    if (pendingMarkerRef.current) { pendingMarkerRef.current.remove(); pendingMarkerRef.current = null; }
    await load();
  }

  async function toggleActive(p: PickupPoint) {
    await (supabase.from("pickup_points" as never).update({ is_active: !p.is_active }).eq("id", p.id) as unknown as Promise<unknown>);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("O'chirilsinmi?")) return;
    await (supabase.from("pickup_points" as never).delete().eq("id", id) as unknown as Promise<unknown>);
    toast.success("O'chirildi");
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-slate-900">Topshirish nuqtalari</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Mijozlar xaritadan tanlaydi</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d4f8a] text-white text-[13px] font-semibold active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      {/* Admin map */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-[13px] text-slate-500">
          <MapPin className="h-4 w-4 text-[#1d4f8a]" />
          {showForm ? "Xaritada joylashuvni tanlang (bosing)" : "Mavjud nuqtalar xaritada"}
        </div>
        <div ref={mapContainerRef} style={{ height: 280 }} />
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#1d4f8a]/20">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-slate-900">{editId ? "Tahrirlash" : "Yangi nuqta"}</p>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nom *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="HammaBop Chilonzor"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Manzil *</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Toshkent, Chilonzor tumani…"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Ish vaqti</label>
                <input value={form.working_hours} onChange={e => setForm(p => ({ ...p, working_hours: e.target.value }))}
                  placeholder="09:00–18:00"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Telefon</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+998 71 …"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a]" />
              </div>
            </div>
            {pendingLat ? (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Koordinata: {pendingLat.toFixed(5)}, {pendingLng?.toFixed(5)}
              </p>
            ) : (
              <p className="text-[11px] text-amber-500">⚠ Xaritada joylashuvni bosing</p>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="w-full h-10 rounded-xl bg-[#1d4f8a] text-white text-[13px] font-bold flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-60"
            >
              {saving ? "Saqlanmoqda…" : <><Check className="h-4 w-4" /> Saqlash</>}
            </button>
          </div>
        </div>
      )}

      {/* Points list */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-[13px]">Yuklanmoqda…</div>
      ) : points.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-[13px]">Nuqtalar yo'q</div>
      ) : (
        <div className="space-y-2">
          {points.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${p.is_active ? "border-slate-100" : "border-slate-200 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${p.is_active ? "bg-[#1d4f8a]" : "bg-slate-300"}`}>
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[13px] text-slate-900">{p.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {p.is_active ? "Faol" : "Nofaol"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.address}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" />{p.working_hours}</span>
                    {p.phone && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(p)} className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition">
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button onClick={() => toggleActive(p)} className={`h-8 w-8 rounded-lg flex items-center justify-center active:scale-90 transition ${p.is_active ? "bg-amber-50" : "bg-emerald-50"}`}>
                    {p.is_active ? <X className="h-3.5 w-3.5 text-amber-500" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </button>
                  <button onClick={() => remove(p.id)} className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center active:scale-90 transition">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
