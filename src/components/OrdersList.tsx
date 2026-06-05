import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Copy, MapPin, MessageCircle, Package, Tag, User } from "lucide-react";
import { toast } from "sonner";
import { BoxLoader } from "@/components/BoxLoader";
import { Button } from "@/components/ui/button";
import { statusMeta } from "@/constants";
import { extractOrderItems } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import { OrderTracking } from "@/components/OrderTracking";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 Naqd pul",
  click: "⚡ Click",
  payme: "💳 Payme",
  alif: "🏦 Alif Nasiya",
  uzum: "🍇 Uzum Nasiya",
};

// Estimate delivery date: order date + 3-5 days
function getDeliveryDate(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 4);
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });
}

type Props = {
  orders: Order[];
  loading: boolean;
  isTelegramConnected: boolean;
  telegramLinkLoading: string | null;
  onTelegramLink: (type: "connect" | "order", orderId?: string) => void;
  onScrollToCatalog: () => void;
};

export function OrdersList({ orders, loading, isTelegramConnected, telegramLinkLoading, onTelegramLink, onScrollToCatalog }: Props) {
  const { format: formatPrice } = useCurrency();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyOrderId = (id: string) => {
    const short = `10${id.slice(0, 6).toUpperCase()}-0001`;
    navigator.clipboard.writeText(short).then(() => toast.success("Buyurtma raqami nusxalandi"));
  };

  if (loading) return <BoxLoader className="py-10" />;

  if (!orders.length) {
    return (
      <div className="mx-3 rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <Package className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900">Hali buyurtma yo'q</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Birinchi buyurtmangizni bering va bu yerda uning holatini kuzating.
        </p>
        <Button className="mt-6 h-12 rounded-full bg-[#1d4f8a] px-8 text-white hover:bg-[#164078]" onClick={onScrollToCatalog}>
          Katalogga o'tish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-3">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-white rounded-t-2xl overflow-hidden">
        <button className="flex-1 py-3.5 text-sm font-medium text-neutral-400 border-b-2 border-transparent">
          Faollar
        </button>
        <button className="flex-1 py-3.5 text-sm font-bold text-neutral-900 border-b-2 border-neutral-900">
          Barchasi
        </button>
      </div>

      {orders.map((order) => {
        const items = extractOrderItems(order.items);
        const meta = statusMeta[order.status];
        const discount = (order as Order & { discount_amount?: number }).discount_amount ?? 0;
        const delFee = (order as Order & { order_delivery_fee?: number }).order_delivery_fee ?? 0;
        const payMethod = (order as Order & { payment_method?: string }).payment_method ?? "cash";
        const promoCode = (order as Order & { promo_code?: string }).promo_code;
        const isExpanded = expandedIds.has(order.id);
        const shortId = `10${order.id.slice(0, 6).toUpperCase()}-0001`;
        const createdDate = new Date(order.created_at).toLocaleDateString("uz-UZ", {
          day: "numeric", month: "long", year: "numeric",
        }) + ", " + new Date(order.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

        return (
          <article key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">

            {/* Status + order number */}
            <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-[16px] font-bold text-neutral-900">Buyurtma №{shortId}</p>
                <button onClick={() => copyOrderId(order.id)} className="p-1 text-[#1d4f8a]">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{createdDate}</p>
            </div>

            {/* Delivery estimate */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-[15px] font-bold text-neutral-900">
                {order.status === "yetkazildi" ? "Yetkazildi" : `${getDeliveryDate(order.created_at)} yetkaziladi`}
              </p>

              {/* Product thumbnails */}
              <div className="mt-2 flex gap-2">
                {items.slice(0, 4).map((item, i) => (
                  <div key={i} className="h-16 w-16 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center">
                    <Package className="h-6 w-6 text-neutral-300" />
                  </div>
                ))}
              </div>

              <p className="mt-2 text-sm text-neutral-500">
                {items.length} ta mahsulot · {formatPrice(Number(order.total_amount))}
              </p>
            </div>

            {/* Tracking */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <OrderTracking order={order} />
            </div>

            {/* Tovarlarni baholash */}
            {order.status === "yetkazildi" && (
              <div className="px-4 py-3 border-b border-neutral-100">
                <button className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 w-full text-left">
                  Tovarlarni baholash
                </button>
              </div>
            )}

            {/* Delivery info */}
            <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
              <div>
                <p className="text-[13px] font-bold text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#1d4f8a]" /> Topshirish manzili
                </p>
                <p className="mt-0.5 text-sm text-neutral-600">{order.customer_region}</p>
                {(order as Order & { address_detail?: string }).address_detail && (
                  <p className="text-xs text-neutral-400">{(order as Order & { address_detail?: string }).address_detail}</p>
                )}
              </div>
              <div>
                <p className="text-[13px] font-bold text-neutral-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#1d4f8a]" /> Buyurtmani qabul qiluvchi
                </p>
                <p className="mt-0.5 text-sm text-neutral-600">{order.customer_name}</p>
                <p className="text-sm text-neutral-600">{order.customer_phone}</p>
              </div>
            </div>

            {/* Total + Batafsil */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-neutral-900">Jami</span>
                <span className="text-[17px] font-extrabold text-neutral-900">{formatPrice(Number(order.total_amount))}</span>
              </div>

              <button onClick={() => toggleExpand(order.id)}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#1d4f8a]">
                Batafsil {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-3 text-sm">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-neutral-600">
                      <span className="line-clamp-1 flex-1 mr-2">{item.product_name} × {item.quantity}</span>
                      <span className="font-semibold text-neutral-900 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 border-t border-neutral-200 pt-2">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Chegirma {promoCode && `(${promoCode})`}</span>
                      <span>−{formatPrice(discount)}</span>
                    </div>
                  )}
                  {delFee > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Yetkazish</span>
                      <span>{formatPrice(delFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-200 pt-2">
                    <span>To'lov usuli</span>
                    <span>{PAYMENT_LABELS[payMethod] ?? payMethod}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Elektron chek */}
            <div className="border-t border-neutral-100 px-4 py-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#1d4f8a]" />
              <button className="text-sm font-semibold text-[#1d4f8a]">Elektron chek</button>
            </div>

            {/* Telegram kuzatish */}
            <div className="border-t border-neutral-100 px-4 py-3">
              {isTelegramConnected ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Buyurtma Telegram orqali kuzatilmoqda</span>
                </div>
              ) : (
                <button
                  onClick={() => onTelegramLink("order", order.id)}
                  disabled={telegramLinkLoading === order.id}
                  className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 w-full disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  Telegram orqali kuzatish
                  {telegramLinkLoading === order.id && (
                    <span className="ml-auto text-xs text-blue-400">Yuklanmoqda...</span>
                  )}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
