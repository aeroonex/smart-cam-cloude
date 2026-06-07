import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronUp, Copy, ExternalLink,
  MapPin, Package, Printer, Receipt, ShoppingBag,
  Tag, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { extractOrderItems } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

/* ─── Types ─── */
type Order = Database["public"]["Tables"]["orders"]["Row"];
type Ext = Order & {
  order_number?: number;
  discount_amount?: number;
  order_delivery_fee?: number;
  payment_method?: string;
  promo_code?: string;
  address_detail?: string;
  tracking_token?: string;
};

/* ─── Status system ─── */
const S: Record<string, { label: string; color: string; bg: string; txt: string; ring: string }> = {
  yangi:              { label: "Yangi",          color:"#f97316", bg:"#fff7ed", txt:"#9a3412", ring:"rgba(249,115,22,.2)" },
  qabul_qilindi:     { label: "Tasdiqlandi",     color:"#10b981", bg:"#f0fdf4", txt:"#065f46", ring:"rgba(16,185,129,.2)" },
  tolov_jarayonida:  { label: "To'lov",          color:"#3b82f6", bg:"#eff6ff", txt:"#1e40af", ring:"rgba(59,130,246,.2)" },
  qadoqlanmoqda:     { label: "Qadoqlanmoqda",  color:"#8b5cf6", bg:"#f5f3ff", txt:"#5b21b6", ring:"rgba(139,92,246,.2)" },
  yetkazilmoqda:     { label: "Kuryer yo'lda",   color:"#6366f1", bg:"#eef2ff", txt:"#3730a3", ring:"rgba(99,102,241,.2)" },
  mijoz_qabul_qildi: { label: "Yetkazildi",      color:"#22c55e", bg:"#f0fdf4", txt:"#15803d", ring:"rgba(34,197,94,.2)"  },
  rad_etildi:        { label: "Bekor qilindi",   color:"#ef4444", bg:"#fef2f2", txt:"#991b1b", ring:"rgba(239,68,68,.2)"  },
};

const STEP_KEYS = ["yangi","qabul_qilindi","qadoqlanmoqda","yetkazilmoqda","mijoz_qabul_qildi"];

const PAY: Record<string, string> = {
  cash:"💵 Naqd", click:"⚡ Click", payme:"💳 Payme", alif:"🏦 Alif", uzum:"🍇 Uzum", card:"💳 Karta",
};

const ITEM_COLORS = ["#6366f1","#f97316","#10b981","#8b5cf6","#ec4899","#3b82f6"];

function shortNum(n?: number) {
  return n ? "HB-" + String(n).padStart(6,"0") : null;
}
function delivEst(created: string, delivDate?: string | null) {
  if (delivDate) return new Date(delivDate).toLocaleDateString("uz-UZ",{day:"numeric",month:"long"});
  const d = new Date(created); d.setDate(d.getDate()+4);
  return d.toLocaleDateString("uz-UZ",{day:"numeric",month:"long"});
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("uz-UZ",{day:"numeric",month:"short"})
    + " · " + new Date(s).toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"});
}

/* ─── CSS ─── */
const CSS = `
@keyframes ol-up   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
@keyframes ol-fade { from{opacity:0} to{opacity:1} }
@keyframes ol-ping { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.4} }
@keyframes ol-truck{ 0%{left:-8%} 100%{left:102%} }
@keyframes ol-road { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
.ol-card { animation: ol-up .4s cubic-bezier(.22,1,.36,1) both }
.ol-card:nth-child(2){animation-delay:.06s}
.ol-card:nth-child(3){animation-delay:.12s}
.ol-card:nth-child(4){animation-delay:.18s}
.ol-card:nth-child(5){animation-delay:.24s}
.ol-ping { animation: ol-ping 1.8s ease-in-out infinite }
.ol-truck{ position:absolute; bottom:6px; font-size:22px; animation:ol-truck 3.5s linear infinite }
.ol-road { animation: ol-road 1.8s linear infinite }
@media print {
  body>*:not(#ol-receipt){ display:none!important }
  #ol-receipt{ display:block!important;position:fixed;inset:0;background:#fff;z-index:99999;padding:28px }
}
`;

/* ─── Mini step dots ─── */
function MiniSteps({ status }: { status: string }) {
  const idx = STEP_KEYS.indexOf(status);
  const s = S[status] ?? S.yangi;
  if (status === "rad_etildi") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="text-xs font-semibold text-red-500">Bekor qilindi</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 flex-1">
      {STEP_KEYS.map((_, i) => {
        const done   = i < idx;
        const active = i === idx;
        const last   = i === STEP_KEYS.length - 1;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="relative shrink-0">
              <div
                className="h-2.5 w-2.5 rounded-full transition-all duration-500"
                style={{
                  background: done || active ? s.color : "#e5e7eb",
                  boxShadow: active ? `0 0 0 3px ${s.ring}` : "none",
                  transform: active ? "scale(1.25)" : "scale(1)",
                }}
              />
              {active && (
                <div className="ol-ping absolute inset-0 rounded-full"
                  style={{ background: s.color }} />
              )}
            </div>
            {!last && (
              <div className="flex-1 h-px mx-0.5 rounded"
                style={{ background: done ? s.color : "#e5e7eb" }} />
            )}
          </div>
        );
      })}
      <span className="ml-2 shrink-0 text-[11px] font-semibold" style={{ color: s.txt }}>
        {s.label}
      </span>
    </div>
  );
}

/* ─── Truck animation (only when in transit) ─── */
function TruckAnim() {
  return (
    <div className="relative overflow-hidden rounded-xl px-3 py-2.5 mb-2"
      style={{ background:"linear-gradient(135deg,#eef2ff,#f5f3ff)" }}>
      <div className="relative h-8">
        <div className="absolute bottom-1 left-0 right-0 h-1 rounded-full bg-neutral-200 overflow-hidden">
          <div className="ol-road h-full w-1/3 rounded-full bg-indigo-200" />
        </div>
        <div className="ol-truck">🚚</div>
      </div>
      <p className="text-[10px] font-semibold text-indigo-500 mt-0.5">Kuryer yetkazib bormoqda…</p>
    </div>
  );
}

/* ─── Receipt modal ─── */
function Receipt({ order, onClose }: { order: Ext; onClose: () => void }) {
  const { format: fp } = useCurrency();
  const items = extractOrderItems(order.items);
  const num = shortNum(order.order_number);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)" }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}
    >
      <div id="ol-receipt"
        className="w-full max-w-[340px] rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ animation:"ol-up .4s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* header */}
        <div className="px-5 py-4 text-center"
          style={{ background:"linear-gradient(135deg,#1d4f8a,#2860b5)" }}>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 mb-2">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <p className="font-extrabold text-white text-base leading-none">HammaBop</p>
          <p className="text-white/60 text-[11px] mt-0.5">Elektron chek</p>
        </div>
        {/* order num */}
        <div className="px-5 pt-3 pb-2.5 flex items-center justify-between border-b border-dashed border-neutral-200">
          <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-widest">Buyurtma</span>
          <span className="font-mono font-extrabold text-[#1d4f8a] text-lg">{num ?? `#${order.id.slice(0,8).toUpperCase()}`}</span>
        </div>
        {/* items */}
        <div className="px-5 py-3 space-y-2 border-b border-dashed border-neutral-200">
          {items.map((it,i)=>(
            <div key={i} className="flex justify-between text-sm">
              <span className="text-neutral-700 flex-1 mr-2 line-clamp-1">{it.product_name} <span className="text-neutral-400">×{it.quantity}</span></span>
              <span className="font-semibold shrink-0">{fp(it.price*it.quantity)}</span>
            </div>
          ))}
        </div>
        {/* totals */}
        <div className="px-5 py-3 space-y-1.5 text-sm border-b border-dashed border-neutral-200">
          {(order.discount_amount??0)>0&&<div className="flex justify-between text-emerald-600"><span>Chegirma</span><span>−{fp(order.discount_amount??0)}</span></div>}
          {(order.order_delivery_fee??0)>0&&<div className="flex justify-between text-neutral-500"><span>Yetkazish</span><span>{fp(order.order_delivery_fee??0)}</span></div>}
          <div className="flex justify-between font-extrabold text-neutral-900 text-base pt-1">
            <span>Jami</span><span>{fp(Number(order.total_amount))}</span>
          </div>
        </div>
        {/* meta */}
        <div className="px-5 py-3 space-y-1 text-xs text-neutral-500 border-b border-dashed border-neutral-200">
          <div className="flex justify-between"><span>Sana</span><span>{new Date(order.created_at).toLocaleDateString("uz-UZ",{day:"numeric",month:"long",year:"numeric"})}</span></div>
          <div className="flex justify-between"><span>To'lov</span><span>{PAY[order.payment_method??""]??order.payment_method??"—"}</span></div>
          <div className="flex justify-between"><span>Holat</span>
            <span className={order.payment_status==="paid"?"text-emerald-600 font-semibold":"text-amber-600 font-semibold"}>
              {order.payment_status==="paid"?"To'langan ✓":"Kutilmoqda"}
            </span>
          </div>
        </div>
        {/* barcode decor */}
        <div className="px-5 py-3 text-center">
          <p className="text-[9px] text-neutral-300 mb-1.5">{order.id.slice(0,20)}…</p>
          <div className="flex justify-center gap-[1.5px]">
            {order.id.replace(/-/g,"").slice(0,22).split("").map((c,i)=>(
              <div key={i} className="rounded-[1px] bg-neutral-800"
                style={{ width:parseInt(c,16)%3===0?3:parseInt(c,16)%3===1?2:1, height:20+(parseInt(c,16)%4)*5 }} />
            ))}
          </div>
        </div>
        {/* actions */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          <button onClick={()=>window.print()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#1d4f8a] py-3 text-sm font-bold text-white active:scale-95 transition-transform">
            <Printer className="h-4 w-4" /> Chop etish
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-100 py-3 text-sm font-bold text-neutral-700 active:scale-95 transition-transform">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Props ─── */
export type OrdersListProps = {
  orders: Order[];
  loading: boolean;
  onScrollToCatalog: () => void;
};

/* ══════════════════════════════════════
         MAIN — OrdersList
══════════════════════════════════════ */
export function OrdersList({ orders, loading, onScrollToCatalog }: OrdersListProps) {
  const { format: fp } = useCurrency();
  const navigate = useNavigate();
  const [tab, setTab]         = useState<"active"|"all">("active");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [receipt, setReceipt]   = useState<Ext|null>(null);

  const ACTIVE = new Set(["yangi","qabul_qilindi","tolov_jarayonida","qadoqlanmoqda","yetkazilmoqda"]);
  const activeOrders = orders.filter(o => ACTIVE.has(o.status)) as Ext[];
  const allOrders    = orders as Ext[];
  const list         = tab==="active" ? activeOrders : allOrders;

  function toggle(id: string) {
    setExpanded(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function copy(o: Ext) {
    const txt = shortNum(o.order_number) ?? `#${o.id.slice(0,8).toUpperCase()}`;
    navigator.clipboard.writeText(txt).then(()=>toast.success("Nusxalandi"));
  }

  if (loading) return (
    <div className="px-3 pt-2 space-y-3">
      {[0,1,2].map(i=>(
        <div key={i} className="rounded-2xl bg-white overflow-hidden shadow-sm animate-pulse">
          <div className="h-1 bg-neutral-100" />
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-24 rounded-full bg-neutral-100" />
              <div className="h-4 w-20 rounded bg-neutral-100" />
            </div>
            <div className="flex gap-2">
              {[0,1,2].map(j=><div key={j} className="h-12 w-12 rounded-xl bg-neutral-100" />)}
            </div>
            <div className="h-3 w-full rounded bg-neutral-100" />
            <div className="h-3 w-3/4 rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="relative mb-5">
          <div className="h-24 w-24 rounded-3xl bg-neutral-100 flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-neutral-300" />
          </div>
          <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-[#1d4f8a] flex items-center justify-center">
            <span className="text-white text-xs font-bold">0</span>
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900">Hali buyurtma yo'q</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-xs">
          Birinchi buyurtmangizni bering va bu yerda uning holati kuzatiladi
        </p>
        <button
          onClick={onScrollToCatalog}
          className="mt-6 h-12 rounded-2xl bg-[#1d4f8a] px-10 text-sm font-bold text-white active:scale-95 transition-transform"
        >
          Katalogga o'tish →
        </button>
      </div>
    );
  }

  return (
    <div>
      <style>{CSS}</style>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 px-3 pt-2 pb-3 bg-[#f4f6fb]">
        <div className="flex rounded-2xl overflow-hidden bg-white shadow-sm border border-neutral-100/80 p-1 gap-1">
          {([
            { key:"active",  label:"Faol",      count:activeOrders.length },
            { key:"all",     label:"Barchasi",  count:allOrders.length    },
          ] as const).map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab===t.key
                  ? "bg-[#1d4f8a] text-white shadow-md shadow-[#1d4f8a]/20"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}>
              {t.label}
              <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-[10px] font-bold text-center ${
                tab===t.key ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-500"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty tab ── */}
      {list.length===0 && (
        <div className="mx-3 mt-1 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-bold text-neutral-800">Hamma buyurtmalar yetkazildi!</p>
          <p className="text-sm text-neutral-400 mt-1">Faol buyurtma mavjud emas</p>
          <button onClick={()=>setTab("all")} className="mt-3 text-sm font-semibold text-[#1d4f8a]">Barchasini ko'rish →</button>
        </div>
      )}

      {/* ── Cards ── */}
      <div className="px-3 pb-6 space-y-3">
        {list.map(order=>{
          const items      = extractOrderItems(order.items);
          const s          = S[order.status] ?? S.yangi;
          const num        = shortNum(order.order_number);
          const displayId  = num ?? `#${order.id.slice(0,8).toUpperCase()}`;
          const discount   = order.discount_amount ?? 0;
          const delFee     = order.order_delivery_fee ?? 0;
          const payMethod  = order.payment_method ?? "cash";
          const promoCode  = order.promo_code;
          const isExpanded = expanded.has(order.id);
          const isTransit  = order.status==="yetkazilmoqda";
          const isDone     = order.status==="mijoz_qabul_qildi";
          const isRej      = order.status==="rad_etildi";
          const trackUrl   = `/track?id=${order.tracking_token??order.id}`;

          return (
            <article key={order.id}
              className="ol-card rounded-2xl bg-white shadow-sm overflow-hidden border border-neutral-100/60">

              {/* ── Top accent line ── */}
              <div className="h-[3px]" style={{ background: s.color }} />

              {/* ── Header row ── */}
              <div className="px-4 pt-3 pb-2.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background:s.bg, color:s.txt }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background:s.color }} />
                    {s.label}
                  </span>
                  <button onClick={()=>copy(order)}
                    className="flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2 py-1 text-xs font-mono font-bold text-neutral-600 hover:bg-neutral-100 transition">
                    {displayId}
                    <Copy className="h-2.5 w-2.5 text-neutral-400" />
                  </button>
                </div>
                <span className="shrink-0 text-[11px] text-neutral-400 mt-0.5">{fmtDate(order.created_at)}</span>
              </div>

              {/* ── Truck animation ── */}
              {isTransit && <div className="px-4"><TruckAnim /></div>}

              {/* ── Product strip ── */}
              <div className="px-4 pb-3 flex items-center gap-3">
                {/* Thumbnails */}
                <div className="flex gap-1.5 shrink-0">
                  {items.slice(0,3).map((_,i)=>(
                    <div key={i}
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background:`${ITEM_COLORS[i%ITEM_COLORS.length]}18` }}>
                      <Package className="h-5 w-5" style={{ color:ITEM_COLORS[i%ITEM_COLORS.length] }} />
                    </div>
                  ))}
                  {items.length>3 && (
                    <div className="h-12 w-12 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-neutral-500">+{items.length-3}</span>
                    </div>
                  )}
                </div>
                {/* Names + count */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-tight">
                    {items.map(it=>it.product_name).join(", ")}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {items.length} ta mahsulot
                  </p>
                </div>
              </div>

              {/* ── Mini stepper ── */}
              {!isRej && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-0">
                    <MiniSteps status={order.status} />
                  </div>
                </div>
              )}
              {isRej && (
                <div className="px-4 pb-3">
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex items-center gap-2">
                    <span className="text-base">❌</span>
                    <span className="text-xs font-semibold text-red-600">Buyurtma rad etildi — operator bilan bog'laning</span>
                  </div>
                </div>
              )}

              {/* ── Info pills row ── */}
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {order.customer_region && (
                  <div className="flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1.5">
                    <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-600">{order.customer_region}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1.5">
                  <span className="text-[11px]">📅</span>
                  <span className="text-[11px] font-semibold text-neutral-600">
                    {isDone ? "Yetkazildi" : delivEst(order.created_at, (order as Ext & {delivery_date?:string}).delivery_date)}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1.5">
                  <span className="text-[11px]">{PAY[payMethod]?.split(" ")[0]??"💵"}</span>
                  <span className="text-[11px] font-semibold text-neutral-600">
                    {PAY[payMethod]?.split(" ").slice(1).join(" ")??payMethod}
                  </span>
                </div>
              </div>

              {/* ── Bottom bar: total + actions ── */}
              <div className="px-4 pb-3 pt-1 border-t border-neutral-100 flex items-center gap-2">
                {/* Total */}
                <div className="flex-1">
                  <p className="text-[11px] text-neutral-400">Jami to'lov</p>
                  <p className="text-[17px] font-extrabold text-neutral-900 leading-tight">{fp(Number(order.total_amount))}</p>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Track */}
                  <button onClick={()=>navigate(trackUrl)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-bold transition active:scale-95"
                    style={{ background:s.bg, color:s.txt }}>
                    <Truck className="h-3.5 w-3.5" />
                    Kuzatish
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </button>
                  {/* Receipt */}
                  <button onClick={()=>setReceipt(order)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition active:scale-95">
                    <Printer className="h-4 w-4" />
                  </button>
                  {/* Expand */}
                  <button onClick={()=>toggle(order.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 ${
                      isExpanded ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* ── Expanded: product list + price breakdown ── */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-neutral-100">
                  <div className="rounded-2xl bg-neutral-50 p-3 mt-3 space-y-0">
                    {/* Products */}
                    {items.map((it,i)=>(
                      <div key={i} className={`flex items-center gap-3 py-2.5 ${i<items.length-1?"border-b border-neutral-100/80":""}`}>
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background:`${ITEM_COLORS[i%ITEM_COLORS.length]}18` }}>
                          <Package className="h-4 w-4" style={{ color:ITEM_COLORS[i%ITEM_COLORS.length] }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-neutral-800 line-clamp-1">{it.product_name}</p>
                          <p className="text-[11px] text-neutral-400">{it.quantity} ta × {fp(it.price)}</p>
                        </div>
                        <p className="text-[13px] font-bold text-neutral-900 shrink-0">{fp(it.price*it.quantity)}</p>
                      </div>
                    ))}

                    {/* Price breakdown */}
                    <div className="pt-2 mt-1 border-t border-neutral-200 space-y-1.5">
                      {discount>0 && (
                        <div className="flex justify-between text-[12px]">
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <Tag className="h-3 w-3" />Chegirma{promoCode&&` (${promoCode})`}
                          </span>
                          <span className="font-semibold text-emerald-600">−{fp(discount)}</span>
                        </div>
                      )}
                      {delFee>0 && (
                        <div className="flex justify-between text-[12px] text-neutral-500">
                          <span>Yetkazish xizmati</span>
                          <span>{fp(delFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[14px] font-extrabold text-neutral-900 pt-1 border-t border-neutral-200">
                        <span>Umumiy</span>
                        <span>{fp(Number(order.total_amount))}</span>
                      </div>
                    </div>

                    {/* Delivery & contact */}
                    <div className="pt-3 mt-1 border-t border-neutral-200 space-y-2">
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-neutral-400 w-24 shrink-0">Qabul qiluvchi</span>
                        <span className="font-semibold text-neutral-800">{order.customer_name} · {order.customer_phone}</span>
                      </div>
                      {order.address_detail && (
                        <div className="flex gap-2 text-[12px]">
                          <span className="text-neutral-400 w-24 shrink-0">Manzil</span>
                          <span className="text-neutral-700">{order.address_detail}</span>
                        </div>
                      )}
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-neutral-400 w-24 shrink-0">To'lov usuli</span>
                        <span className="font-semibold text-neutral-800">{PAY[payMethod]??payMethod}</span>
                      </div>
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-neutral-400 w-24 shrink-0">To'lov holati</span>
                        <span className={`font-semibold ${order.payment_status==="paid"?"text-emerald-600":"text-amber-600"}`}>
                          {order.payment_status==="paid"?"✓ To'langan":"⏳ Kutilmoqda"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Receipt modal */}
      {receipt && <Receipt order={receipt} onClose={()=>setReceipt(null)} />}
    </div>
  );
}
