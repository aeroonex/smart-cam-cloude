import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, CheckCircle2, Clock, MapPin, Package,
  PackageCheck, Printer, RotateCcw, Search, Truck,
  Phone, User, CreditCard, CalendarDays, Star,
} from "lucide-react";

/* ─── Types ─── */
type TrackOrder = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  customer_name: string | null;
  customer_region: string | null;
  customer_phone: string | null;
  address_detail: string | null;
  total_amount: number;
  discount_amount: number;
  order_delivery_fee: number;
  items: Array<{ product_name?: string; quantity?: number; price?: number }>;
  created_at: string;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  tracking_token: string;
  latitude: number | null;
  longitude: number | null;
  courier_name: string | null;
  courier_phone: string | null;
  invoice_url: string | null;
  notes: string | null;
};

/* ─── Delivery steps ─── */
const STEPS = [
  { key: "yangi",             label: "Qabul\nqilindi",   icon: Package,     color: "#6366f1" },
  { key: "qabul_qilindi",    label: "Tayyorlan-\nmoqda", icon: Clock,       color: "#8b5cf6" },
  { key: "qadoqlanmoqda",    label: "Qadoqlan-\nmoqda",  icon: PackageCheck,color: "#a855f7" },
  { key: "yetkazilmoqda",    label: "Yo'lda",             icon: Truck,       color: "#ec4899" },
  { key: "mijoz_qabul_qildi",label: "Yetkazildi",         icon: CheckCircle2,color: "#10b981" },
] as const;

function stepIndex(status: string) {
  const i = STEPS.findIndex(s => s.key === status);
  return i === -1 ? 0 : i;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd pul", click: "Click", payme: "Payme",
  alif: "Alif Nasiya", uzum: "Uzum Nasiya", card: "Karta",
};

function fmtPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("uz-UZ", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function shortNum(n: number) {
  return "HB-" + String(n).padStart(6, "0");
}

/* ─── CSS ─── */
const CSS = `
@keyframes trk-slide-up   { from { opacity:0; transform:translateY(32px) } to { opacity:1; transform:translateY(0) } }
@keyframes trk-fade       { from { opacity:0 } to { opacity:1 } }
@keyframes trk-pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} }
@keyframes trk-fill       { from{width:0} to{width:var(--fill)} }
@keyframes trk-truck      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes trk-spin       { to{transform:rotate(360deg)} }
@keyframes trk-dot        { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
@keyframes trk-confetti-1 { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-120px) rotate(720deg); opacity:0} }
@keyframes trk-confetti-2 { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-90px) rotate(-540deg); opacity:0} }
@keyframes trk-particle   { 0%{transform:translateY(0) scale(1);opacity:.7} 100%{transform:translateY(-80px) scale(.2);opacity:0} }
@keyframes trk-check-draw { to{stroke-dashoffset:0} }
@keyframes trk-shimmer    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.trk-slide-up  { animation: trk-slide-up  .55s cubic-bezier(.22,1,.36,1) both }
.trk-fade      { animation: trk-fade      .4s ease both }
.trk-truck-bob { animation: trk-truck-bob 1.2s ease-in-out infinite }
@keyframes trk-truck-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }

.trk-card      { animation: trk-slide-up .55s cubic-bezier(.22,1,.36,1) both }
.trk-card:nth-child(2) { animation-delay:.08s }
.trk-card:nth-child(3) { animation-delay:.16s }
.trk-card:nth-child(4) { animation-delay:.24s }

.trk-shimmer {
  background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
  background-size:200% 100%;
  animation: trk-shimmer 1.4s infinite;
  border-radius:8px;
}

.trk-receipt-btn:active { transform: scale(.97) }

@media print {
  body > *:not(#trk-receipt-print) { display:none !important }
  #trk-receipt-print { display:block !important; position:fixed; inset:0; background:#fff; z-index:99999; padding:32px }
}
`;

/* ─── Loading dots ─── */
function Dots() {
  return (
    <div className="flex gap-1.5 items-center justify-center py-2">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-2 w-2 rounded-full bg-indigo-400"
          style={{ animation: `trk-dot 1.2s ease-in-out ${i * 0.16}s infinite` }} />
      ))}
    </div>
  );
}

/* ─── Step progress ─── */
function StepProgress({ currentStep, rejected }: { currentStep: number; rejected: boolean }) {
  const pct = STEPS.length > 1
    ? (currentStep / (STEPS.length - 1)) * 100
    : 0;

  return (
    <div className="relative pt-2 pb-4">
      {/* Background rail */}
      <div className="absolute top-[22px] left-[36px] right-[36px] h-1 rounded-full bg-neutral-100" />
      {/* Filled rail */}
      <div
        className="absolute top-[22px] left-[36px] h-1 rounded-full"
        style={{
          width: `calc(${pct}% * (100% - 72px) / 100)`,
          maxWidth: `calc(100% - 72px)`,
          background: rejected
            ? "#ef4444"
            : "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)",
          transition: "width 1s cubic-bezier(.22,1,.36,1)",
          boxShadow: rejected ? "none" : "0 0 8px rgba(168,85,247,.5)",
        }}
      />
      {/* Steps */}
      <div className="relative flex justify-between px-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = !rejected && i < currentStep;
          const active = !rejected && i === currentStep;
          const future = rejected || i > currentStep;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ width: "20%" }}>
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                style={{
                  background: done
                    ? `linear-gradient(135deg,${step.color},${STEPS[Math.min(i + 1, STEPS.length - 1)].color})`
                    : active
                    ? "#fff"
                    : "#f8f8fa",
                  borderColor: done || active ? step.color : "#e5e7eb",
                  boxShadow: active
                    ? `0 0 0 4px ${step.color}22, 0 4px 12px ${step.color}44`
                    : done
                    ? `0 2px 8px ${step.color}55`
                    : "none",
                  transform: active ? "scale(1.12)" : "scale(1)",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={2.2}
                  style={{ color: done ? "#fff" : active ? step.color : "#d1d5db" }}
                />
              </div>
              <span
                className="text-center text-[9.5px] font-semibold leading-tight whitespace-pre-line"
                style={{ color: done || active ? step.color : "#9ca3af" }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Map section ─── */
function MapSection({ lat, lng, region }: { lat: number | null; lng: number | null; region: string | null }) {
  if (lat && lng) {
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
    return (
      <div className="trk-card overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
          <MapPin className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-neutral-800">Yetkazish manzili</span>
        </div>
        <div className="relative" style={{ height: 180 }}>
          <iframe
            title="Xarita"
            src={url}
            className="w-full h-full border-0"
            loading="lazy"
          />
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-neutral-200 rounded-b-2xl" />
        </div>
      </div>
    );
  }
  if (!region) return null;
  return (
    <div className="trk-card flex items-center gap-3 rounded-2xl bg-white shadow-sm px-4 py-4">
      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
        <MapPin className="h-5 w-5 text-indigo-500" />
      </div>
      <div>
        <p className="text-xs font-semibold text-neutral-400">Yetkazish viloyati</p>
        <p className="text-sm font-bold text-neutral-900 mt-0.5">{region}</p>
      </div>
    </div>
  );
}

/* ─── Receipt modal ─── */
function ReceiptModal({ order, onClose }: { order: TrackOrder; onClose: () => void }) {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="trk-receipt-print"
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: "trk-slide-up .4s cubic-bezier(.22,1,.36,1)" }}>

        {/* Header */}
        <div className="px-6 py-5 text-center"
          style={{ background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)" }}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 mb-2">
            <Package className="h-6 w-6 text-white" />
          </div>
          <p className="text-white font-extrabold text-lg">HammaBop</p>
          <p className="text-white/70 text-xs mt-0.5">Elektron chek / Квитанция</p>
        </div>

        {/* Order number */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-dashed border-neutral-200">
          <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Buyurtma №</span>
          <span className="font-mono font-extrabold text-indigo-600 text-lg">{shortNum(order.order_number)}</span>
        </div>

        {/* Items */}
        <div className="px-6 py-3 space-y-2 border-b border-dashed border-neutral-200">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-neutral-700 flex-1 mr-2 line-clamp-1">
                {item.product_name ?? "Mahsulot"} <span className="text-neutral-400">× {item.quantity ?? 1}</span>
              </span>
              <span className="font-semibold text-neutral-900 shrink-0">
                {fmtPrice((item.price ?? 0) * (item.quantity ?? 1))}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-3 space-y-1.5 border-b border-dashed border-neutral-200 text-sm">
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Chegirma</span>
              <span>−{fmtPrice(order.discount_amount)}</span>
            </div>
          )}
          {order.order_delivery_fee > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Yetkazish</span>
              <span>{fmtPrice(order.order_delivery_fee)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-neutral-900 text-base pt-1">
            <span>Jami</span>
            <span>{fmtPrice(order.total_amount)}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 space-y-1 text-xs text-neutral-500 border-b border-dashed border-neutral-200">
          <div className="flex justify-between">
            <span>Sana</span>
            <span>{fmtDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>To'lov</span>
            <span>{PAYMENT_LABELS[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Holat</span>
            <span className={order.payment_status === "paid" ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
              {order.payment_status === "paid" ? "To'langan ✓" : "Kutilmoqda"}
            </span>
          </div>
        </div>

        {/* Barcode area */}
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] text-neutral-400 mb-1">Buyurtma ID</p>
          <p className="font-mono text-[10px] text-neutral-500 break-all">{order.id}</p>
          <div className="mt-3 flex justify-center gap-0.5">
            {order.id.replace(/-/g, "").split("").map((c, i) => (
              <div key={i}
                className="rounded-sm bg-neutral-800"
                style={{
                  width: parseInt(c, 16) % 3 === 0 ? 3 : parseInt(c, 16) % 3 === 1 ? 2 : 1,
                  height: 28 + (parseInt(c, 16) % 4) * 4,
                }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => window.print()}
            className="trk-receipt-btn flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition-transform"
          >
            <Printer className="h-4 w-4" /> Chop etish
          </button>
          <button
            onClick={onClose}
            className="trk-receipt-btn flex items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3 text-sm font-bold text-neutral-700 transition-transform"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
       MAIN COMPONENT
══════════════════════════════════ */
export default function TrackPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("id") ?? "");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = params.get("id");
    if (id) void handleSearch(id);
    else inputRef.current?.focus();
  }, []);

  /* Real-time subscription */
  useEffect(() => {
    if (!order) return;
    const ch = supabase
      .channel(`track-${order.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "orders",
        filter: `id=eq.${order.id}`,
      }, payload => {
        setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<TrackOrder>) } : prev);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [order?.id]);

  async function handleSearch(raw?: string) {
    const q = (raw ?? input).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setOrder(null);

    const { data, error: rpcErr } = await supabase.rpc("track_order", { p_query: q });

    if (rpcErr) {
      setError("Buyurtma topilmadi. Raqamni tekshirib qayta urinib ko'ring.");
      setLoading(false);
      return;
    }

    const found = Array.isArray(data) && data.length > 0 ? data[0] as TrackOrder : null;
    if (found) {
      setOrder(found);
      setParams({ id: found.tracking_token ?? found.id });
    } else {
      setError("Buyurtma topilmadi. Raqamni tekshirib qayta urinib ko'ring.");
    }
    setLoading(false);
  }

  const currentStep = order ? stepIndex(order.status) : -1;
  const isRejected = order?.status === "rad_etildi";
  const isDelivered = order?.status === "mijoz_qabul_qildi";

  return (
    <div className="min-h-screen" style={{ background: "#f4f6fb" }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30"
        style={{ background: "linear-gradient(135deg,#1a3a6b 0%,#1d4f8a 60%,#2d6bb5 100%)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="font-extrabold text-white text-base leading-tight">
              <span style={{ color: "#93c5fd" }}>Hamma</span>Bop
            </p>
            <p className="text-white/50 text-[11px]">Buyurtma kuzatish</p>
          </div>
          {order && (
            <button
              onClick={() => setShowReceipt(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              title="Elektron chek"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-24">

        {/* ── Search card ── */}
        <div
          className="trk-card rounded-3xl shadow-xl overflow-hidden"
          style={{ background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)" }}
        >
          <div className="px-5 pt-5 pb-2">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Buyurtmani kuzatish</p>
            <h1 className="text-white font-extrabold text-xl leading-snug">
              Buyurtmangiz<br />qayerda?
            </h1>
          </div>

          {/* Decorative dots */}
          <div className="relative px-5 pb-5 pt-3">
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-300 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="HB-000001 yoki tracking kod"
                  className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 outline-none"
                  style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading || !input.trim()}
                className="rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", boxShadow: "0 4px 16px rgba(99,102,241,.5)" }}
              >
                {loading ? <RotateCcw className="h-4 w-4 animate-spin" /> : "Izla"}
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-500/20 border border-red-400/30 px-3 py-2 text-xs text-red-100 font-medium">
                {error}
              </div>
            )}

            {!order && !loading && !error && (
              <p className="mt-3 text-white/50 text-xs text-center">
                SMS yoki Telegram xabaringizdagi buyurtma raqamini kiriting
              </p>
            )}

            {loading && (
              <div className="mt-3">
                <Dots />
              </div>
            )}
          </div>
        </div>

        {/* ── Order found ── */}
        {order && (
          <>
            {/* Status header card */}
            <div className="trk-card rounded-3xl bg-white shadow-sm overflow-hidden">
              {/* Top gradient band */}
              <div className="h-1.5 w-full"
                style={{
                  background: isRejected
                    ? "#ef4444"
                    : isDelivered
                    ? "linear-gradient(90deg,#10b981,#34d399)"
                    : "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)"
                }} />

              <div className="px-5 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1">Buyurtma №</p>
                    <p className="font-mono font-extrabold text-2xl text-neutral-900">
                      {shortNum(order.order_number)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{fmtDate(order.created_at)}</p>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      isDelivered ? "bg-emerald-50 text-emerald-700"
                      : isRejected ? "bg-red-50 text-red-600"
                      : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {isDelivered ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : isRejected ? "❌"
                        : <span className="h-2 w-2 rounded-full animate-pulse"
                            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }} />}
                      {isDelivered ? "Yetkazildi"
                        : isRejected ? "Rad etildi"
                        : "Faol"}
                    </div>
                    <p className="text-base font-extrabold text-neutral-900 mt-2">{fmtPrice(order.total_amount)}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${
                      order.payment_status === "paid" ? "text-emerald-600" : "text-amber-500"
                    }`}>
                      {order.payment_status === "paid" ? "✓ To'langan" : "⏳ To'lov kutilmoqda"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Animated progress */}
              {!isRejected && (
                <div className="px-3 pb-4">
                  <StepProgress currentStep={currentStep} rejected={isRejected} />
                </div>
              )}

              {isRejected && (
                <div className="mx-4 mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-bold text-red-700 text-sm">Buyurtma rad etildi</p>
                    <p className="text-xs text-red-400 mt-0.5">Batafsil ma'lumot uchun operator bilan bog'laning</p>
                  </div>
                </div>
              )}

              {/* Delivery estimate */}
              {!isRejected && !isDelivered && (
                <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-4.5 w-4.5 text-indigo-600" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-semibold">Taxminiy yetkazish</p>
                    <p className="text-sm font-bold text-indigo-900 mt-0.5">
                      {order.delivery_date
                        ? fmtDate(order.delivery_date) + (order.delivery_time_slot ? `, ${order.delivery_time_slot}` : "")
                        : (() => {
                            const d = new Date(order.created_at);
                            d.setDate(d.getDate() + 4);
                            return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });
                          })()}
                    </p>
                  </div>
                </div>
              )}

              {isDelivered && (
                <div className="mx-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
                  <Star className="h-5 w-5 text-emerald-500 fill-emerald-400" />
                  <p className="text-sm font-bold text-emerald-800">Buyurtma muvaffaqiyatli yetkazildi! 🎉</p>
                </div>
              )}
            </div>

            {/* ── Animated truck (if in-transit) ── */}
            {order.status === "yetkazilmoqda" && (
              <div className="trk-card rounded-3xl bg-white shadow-sm px-5 py-4 overflow-hidden relative">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Yetkazish jarayoni</p>
                <div className="relative h-14 flex items-end">
                  {/* Road */}
                  <div className="absolute bottom-3 left-0 right-0 h-0.5 rounded-full bg-neutral-200" />
                  {/* Progress on road */}
                  <div className="absolute bottom-3 left-0 h-0.5 rounded-full"
                    style={{
                      width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                      background: "linear-gradient(90deg,#6366f1,#a855f7)",
                      transition: "width 1.5s cubic-bezier(.22,1,.36,1)",
                    }} />
                  {/* Truck */}
                  <div className="absolute bottom-4"
                    style={{
                      left: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 24px)`,
                      transition: "left 1.5s cubic-bezier(.22,1,.36,1)",
                      animation: "trk-truck-bob 1s ease-in-out infinite",
                    }}>
                    <Truck className="h-8 w-8 text-indigo-600 drop-shadow-md" />
                  </div>
                  {/* Start dot */}
                  <div className="absolute bottom-2.5 left-0 h-2 w-2 rounded-full bg-indigo-300" />
                  {/* End dot */}
                  <div className="absolute bottom-2.5 right-0 h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-neutral-400">Ombor</span>
                  <span className="text-[10px] text-neutral-400">Siz</span>
                </div>

                {/* Courier info */}
                {order.courier_name && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-neutral-400">Kuryer</p>
                      <p className="text-sm font-bold text-neutral-900">{order.courier_name}</p>
                    </div>
                    {order.courier_phone && (
                      <a href={`tel:${order.courier_phone}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Map ── */}
            <MapSection lat={order.latitude} lng={order.longitude} region={order.customer_region} />

            {/* ── Customer info ── */}
            <div className="trk-card rounded-3xl bg-white shadow-sm px-5 py-4 space-y-3">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Qabul qiluvchi</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-neutral-900 text-sm">{order.customer_name ?? "—"}</p>
                  {order.customer_phone && (
                    <a href={`tel:${order.customer_phone}`} className="text-xs text-indigo-500 font-medium">{order.customer_phone}</a>
                  )}
                </div>
              </div>
              {order.address_detail && (
                <div className="flex items-start gap-3 pt-1">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-sm text-neutral-600 mt-2.5">{order.address_detail}</p>
                </div>
              )}
            </div>

            {/* ── Products ── */}
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="trk-card rounded-3xl bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mahsulotlar</p>
                </div>
                <div className="px-5 py-3 space-y-2.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 line-clamp-1">
                          {item.product_name ?? "Mahsulot"}
                        </p>
                        <p className="text-xs text-neutral-400">{item.quantity ?? 1} ta</p>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 shrink-0">
                        {fmtPrice((item.price ?? 0) * (item.quantity ?? 1))}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="px-5 pb-4 pt-2 border-t border-neutral-100 space-y-1.5">
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Chegirma</span>
                      <span>−{fmtPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  {order.order_delivery_fee > 0 && (
                    <div className="flex justify-between text-sm text-neutral-500">
                      <span>Yetkazish</span>
                      <span>{fmtPrice(order.order_delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-neutral-900">
                    <span>Jami</span>
                    <span className="text-lg">{fmtPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Payment ── */}
            <div className="trk-card rounded-3xl bg-white shadow-sm px-5 py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-neutral-400">To'lov usuli</p>
                <p className="text-sm font-bold text-neutral-900 mt-0.5">
                  {PAYMENT_LABELS[order.payment_method ?? ""] ?? order.payment_method ?? "—"}
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                order.payment_status === "paid"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {order.payment_status === "paid" ? "To'langan" : "Kutilmoqda"}
              </span>
            </div>

            {/* ── Elektron chek ── */}
            <button
              onClick={() => setShowReceipt(true)}
              className="trk-card trk-receipt-btn w-full rounded-3xl py-4 flex items-center justify-center gap-2.5 font-bold text-white text-sm shadow-lg transition-transform"
              style={{
                background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)",
                boxShadow: "0 8px 24px rgba(29,79,138,.35)",
              }}
            >
              <Printer className="h-5 w-5" />
              Elektron chek olish
            </button>
          </>
        )}

        {/* ── Empty state ── */}
        {!order && !loading && (
          <div className="trk-fade text-center py-8">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm mb-4">
              <Package className="h-10 w-10 text-indigo-300" />
            </div>
            <p className="text-neutral-500 text-sm">Buyurtma ID'ni SMS yoki Telegram xabaringizdan topishingiz mumkin.</p>
            <a href="https://t.me/hammabop_bot" target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-sm">
              @hammabop_bot da yordam olish →
            </a>
          </div>
        )}
      </main>

      {/* Receipt modal */}
      {showReceipt && order && (
        <ReceiptModal order={order} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
