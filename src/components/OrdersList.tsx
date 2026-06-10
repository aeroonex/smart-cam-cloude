import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Printer, Receipt,
  ShoppingBag, Tag, Truck, Star,
} from "lucide-react";
import { toast } from "sonner";
import { extractOrderItems } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import { normalizeImageUrl } from "@/utils/imageUrl";
import type { Database } from "@/integrations/supabase/types";

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

const STATUS: Record<string, { label: string; bg: string; txt: string; dot: string }> = {
  yangi:              { label: "Yangi",          bg: "#FFF7ED", txt: "#C2410C", dot: "#F97316" },
  qabul_qilindi:     { label: "Tasdiqlandi",     bg: "#F0FDF4", txt: "#15803D", dot: "#22C55E" },
  tolov_jarayonida:  { label: "To'lov",          bg: "#EFF6FF", txt: "#1D4ED8", dot: "#3B82F6" },
  qadoqlanmoqda:     { label: "Tayyorlanmoqda",  bg: "#F5F3FF", txt: "#6D28D9", dot: "#8B5CF6" },
  yetkazilmoqda:     { label: "Yetkazilmoqda",   bg: "#EEF2FF", txt: "#3730A3", dot: "#6366F1" },
  mijoz_qabul_qildi: { label: "Yetkazildi",      bg: "#F0FDF4", txt: "#15803D", dot: "#22C55E" },
  rad_etildi:        { label: "Bekor qilindi",   bg: "#FEF2F2", txt: "#991B1B", dot: "#EF4444" },
};

const PAY: Record<string, string> = {
  cash: "Naqd pul", click: "Click", payme: "Payme",
  alif: "Alif Nasiya", uzum: "Uzum Nasiya", card: "Karta",
};

const ACTIVE = new Set(["yangi","qabul_qilindi","tolov_jarayonida","qadoqlanmoqda","yetkazilmoqda"]);

function shortNum(n?: number) {
  return n ? "HB-" + String(n).padStart(6, "0") : null;
}

/* ─── Receipt modal ─── */
function ReceiptModal({ order, onClose }: { order: Ext; onClose: () => void }) {
  const { format: fp } = useCurrency();
  const items = extractOrderItems(order.items);
  const num = shortNum(order.order_number);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-20"
      style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="ol-receipt"
        className="w-full max-w-[360px] rounded-3xl bg-white shadow-2xl overflow-y-auto"
        style={{ animation: "receiptin .35s cubic-bezier(.22,1,.36,1)", maxHeight: "75vh" }}>
        <style>{`@keyframes receiptin{from{transform:translateY(100%)}to{transform:none}}`}</style>

        <div className="px-5 py-4 text-center bg-neutral-900">
          <p className="font-extrabold text-white text-lg">HammaBop</p>
          <p className="text-neutral-400 text-[11px] mt-0.5">Elektron chek</p>
        </div>

        <div className="px-5 pt-3 pb-2.5 flex items-center justify-between border-b border-dashed border-neutral-200">
          <span className="text-[11px] text-neutral-400 font-semibold">Buyurtma №</span>
          <span className="font-mono font-extrabold text-neutral-900 text-lg">{num ?? `#${order.id.slice(0,8).toUpperCase()}`}</span>
        </div>

        <div className="px-5 py-3 space-y-2 border-b border-dashed border-neutral-200">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between text-[13px]">
              <span className="text-neutral-700 flex-1 mr-2 line-clamp-1">{it.product_name} <span className="text-neutral-400">×{it.quantity}</span></span>
              <span className="font-semibold shrink-0">{fp(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 space-y-1.5 text-[13px] border-b border-dashed border-neutral-200">
          {(order.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Chegirma</span><span>−{fp(order.discount_amount ?? 0)}</span>
            </div>
          )}
          {(order.order_delivery_fee ?? 0) > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Yetkazish</span><span>{fp(order.order_delivery_fee ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-neutral-900 text-[15px] pt-1">
            <span>Jami</span><span>{fp(Number(order.total_amount))}</span>
          </div>
        </div>

        <div className="px-5 py-3 space-y-1 text-[12px] text-neutral-500 border-b border-dashed border-neutral-200">
          <div className="flex justify-between">
            <span>Sana</span>
            <span>{new Date(order.created_at).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          <div className="flex justify-between">
            <span>To'lov</span>
            <span>{PAY[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Holat</span>
            <span className={order.payment_status === "paid" ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
              {order.payment_status === "paid" ? "To'langan ✓" : "Kutilmoqda"}
            </span>
          </div>
        </div>

        <div className="px-4 pb-5 pt-4 grid grid-cols-2 gap-2">
          <button onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 py-3 text-[13px] font-bold text-white active:scale-95 transition-transform">
            <Printer className="h-4 w-4" /> Chop etish
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center rounded-2xl bg-[#F5F5F5] py-3 text-[13px] font-bold text-neutral-700 active:scale-95 transition-transform">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

export type OrdersListProps = {
  orders: Order[];
  loading: boolean;
  onScrollToCatalog: () => void;
};

export function OrdersList({ orders, loading, onScrollToCatalog }: OrdersListProps) {
  const { format: fp } = useCurrency();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");
  const [receipt, setReceipt] = useState<Ext | null>(null);

  const ongoing   = orders.filter(o => ACTIVE.has(o.status)) as Ext[];
  const completed = orders.filter(o => !ACTIVE.has(o.status)) as Ext[];
  const list      = tab === "ongoing" ? ongoing : completed;

  if (loading) return (
    <div className="px-4 space-y-3 pt-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl bg-white p-4 flex items-center gap-3 animate-pulse">
          <div className="h-16 w-16 rounded-2xl bg-[#F5F5F5] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-full bg-[#F5F5F5]" />
            <div className="h-3 w-1/2 rounded-full bg-[#F5F5F5]" />
            <div className="h-3 w-1/3 rounded-full bg-[#F5F5F5]" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        {/* Clipboard SVG illustration */}
        <svg viewBox="0 0 120 120" className="w-32 h-32 mb-6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="30" width="80" height="70" rx="10" fill="#F0F0F0" />
          <rect x="35" y="15" width="50" height="30" rx="6" fill="#E0E0E0" />
          <rect x="45" y="10" width="30" height="14" rx="4" fill="#D0D0D0" />
          <line x1="35" y1="60" x2="85" y2="60" stroke="#C0C0C0" strokeWidth="4" strokeLinecap="round" />
          <line x1="35" y1="74" x2="75" y2="74" stroke="#C0C0C0" strokeWidth="4" strokeLinecap="round" />
          <line x1="35" y1="88" x2="65" y2="88" stroke="#C0C0C0" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <h2 className="text-[20px] font-extrabold text-neutral-900">Hali buyurtma yo'q</h2>
        <p className="mt-2 text-[14px] text-neutral-400">Birinchi buyurtmangizni bering va bu yerda uning holati kuzatiladi</p>
        <button onClick={onScrollToCatalog}
          className="mt-6 rounded-2xl bg-black px-10 py-3.5 text-[14px] font-bold text-white active:scale-95 transition-transform">
          Xarid qilish →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Tabs ─── */}
      <div className="flex border-b border-neutral-100 mb-1 px-4">
        {([
          { key: "ongoing",   label: "Jarayondagi", count: ongoing.length   },
          { key: "completed", label: "Tugallangan",  count: completed.length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 py-3.5 mr-6 text-[14px] font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Empty tab ─── */}
      {list.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#F9F9F9] p-8 text-center">
          <ShoppingBag className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-bold text-neutral-700 text-[15px]">
            {tab === "ongoing" ? "Hech qanday faol buyurtma yo'q" : "Tugallangan buyurtma yo'q"}
          </p>
          <p className="text-[13px] text-neutral-400 mt-1">
            {tab === "ongoing" ? "Buyurtma bergach bu yerda ko'rinadi" : "Yetkazilgan buyurtmalar bu yerda ko'rinadi"}
          </p>
          {tab === "completed" && (
            <button onClick={() => setTab("ongoing")}
              className="mt-3 text-[13px] font-semibold text-neutral-700 underline">
              Faol buyurtmalarga o'tish
            </button>
          )}
        </div>
      )}

      {/* ─── Cards ─── */}
      <div className="px-4 py-3 space-y-3 pb-28">
        {list.map(order => {
          const items     = extractOrderItems(order.items);
          const s         = STATUS[order.status] ?? STATUS.yangi;
          const isDone    = order.status === "mijoz_qabul_qildi";
          const isRej     = order.status === "rad_etildi";
          const trackUrl  = `/track?id=${(order as Ext).tracking_token ?? order.id}`;
          const firstItem = items[0];
          const imgUrl    = (order as unknown as { product_images?: string[] }).product_images?.[0]
                            ?? null;

          return (
            <article key={order.id}
              className="rounded-2xl bg-white overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

              <div className="p-4 flex items-start gap-3">
                {/* Product image / icon */}
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#F5F5F5] flex items-center justify-center overflow-hidden">
                  {imgUrl ? (
                    <img src={normalizeImageUrl(imgUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-7 w-7 text-neutral-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Product name */}
                  <p className="text-[14px] font-bold text-neutral-900 line-clamp-1">
                    {firstItem?.product_name ?? "Mahsulot"}
                    {items.length > 1 && (
                      <span className="ml-1 text-[12px] font-normal text-neutral-400">+{items.length - 1} ta</span>
                    )}
                  </p>

                  {/* Meta */}
                  <p className="mt-0.5 text-[12px] text-neutral-400">
                    {[
                      firstItem?.quantity && `Soni: ${firstItem.quantity}`,
                      (order as Ext).payment_method && (PAY[(order as Ext).payment_method!] ?? (order as Ext).payment_method),
                      shortNum((order as Ext).order_number),
                    ].filter(Boolean).join(" · ")}
                  </p>

                  {/* Status badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: s.bg, color: s.txt }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                    {isRej && (
                      <span className="text-[11px] text-neutral-400">Operator bilan bog'laning</span>
                    )}
                  </div>

                  {/* Price */}
                  <p className="mt-2 text-[16px] font-extrabold text-neutral-900">
                    {fp(Number(order.total_amount))}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center gap-2">
                {isDone ? (
                  <>
                    <button
                      onClick={() => navigate(`/product/${(firstItem as unknown as {product_id?:string})?.product_id ?? ""}`)}
                      className="flex-1 rounded-2xl bg-neutral-900 py-2.5 text-[13px] font-bold text-white text-center flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                      <Star className="h-3.5 w-3.5 fill-white" />
                      Izoh qoldirish
                    </button>
                    <button onClick={() => setReceipt(order)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F5F5] text-neutral-600 active:scale-95 transition-transform">
                      <Receipt className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(trackUrl)}
                      className="flex-1 rounded-2xl bg-neutral-900 py-2.5 text-[13px] font-bold text-white text-center flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                      <Truck className="h-3.5 w-3.5" />
                      Buyurtmani kuzatish
                    </button>
                    <button onClick={() => setReceipt(order)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F5F5] text-neutral-600 active:scale-95 transition-transform">
                      <Receipt className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
