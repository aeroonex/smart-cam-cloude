import { Loader2, MessageCircle, Package, CreditCard, Tag } from "lucide-react";
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

type Props = {
  orders: Order[];
  loading: boolean;
  telegramLinkLoading: string | null;
  onTelegramLink: (type: "connect" | "order", orderId?: string) => void;
  onScrollToCatalog: () => void;
};

export function OrdersList({ orders, loading, telegramLinkLoading, onTelegramLink, onScrollToCatalog }: Props) {
  const { format: formatPrice } = useCurrency();

  if (loading) {
    return (
      <div className="panel-surface p-8 text-sm text-[#5C7260]">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Buyurtmalar yuklanmoqda...
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="panel-surface p-10 text-center">
        <Package className="mx-auto h-12 w-12 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
        <h2 className="mt-4 text-2xl font-extrabold text-[#1A3828]">Hali buyurtma yo'q</h2>
        <p className="mt-3 text-sm leading-7 text-[#5C7260]">
          Birinchi buyurtmangizni bering va bu yerda uning holatini kuzating.
        </p>
        <Button className="mt-6 rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]" onClick={onScrollToCatalog}>
          Katalogga o'tish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const items = extractOrderItems(order.items);
        const meta = statusMeta[order.status];
        const discount = (order as Order & { discount_amount?: number }).discount_amount ?? 0;
        const delFee = (order as Order & { order_delivery_fee?: number }).order_delivery_fee ?? 0;
        const payMethod = (order as Order & { payment_method?: string }).payment_method ?? "cash";
        const promoCode = (order as Order & { promo_code?: string }).promo_code;

        return (
          <article key={order.id} className="panel-surface p-5 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-[#eef2ed] pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7b927d]">
                  #{order.id.slice(0, 8).toUpperCase()}
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-[#1A3828]">
                  {new Date(order.created_at).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
                </h2>
                <p className="mt-1 text-xs text-[#5C7260]">
                  {order.customer_name} · {order.customer_phone} · {order.customer_region}
                </p>
              </div>
              <span className={`self-start inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${meta.className}`}>
                {meta.label}
              </span>
            </div>

            {/* Tracking */}
            <div className="py-4 border-b border-[#eef2ed]">
              <OrderTracking order={order} />
            </div>

            {/* Items */}
            <div className="space-y-2 pt-4">
              {items.map((item) => (
                <div key={`${order.id}-${item.product_id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbf7] px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-semibold text-[#254A34]">{item.product_name}</div>
                    <div className="text-xs text-[#5C7260]">{item.quantity} dona × {formatPrice(item.price)}</div>
                  </div>
                  <div className="font-bold text-[#254A34] shrink-0">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Totals + payment */}
            <div className="mt-4 space-y-1.5 rounded-xl bg-neutral-50 p-3 text-sm">
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Promokod {promoCode && `(${promoCode})`}:</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              {delFee > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Yetkazish:</span>
                  <span>{formatPrice(delFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-neutral-900 border-t border-neutral-200 pt-1.5 mt-1.5">
                <span>Jami:</span>
                <span className="text-[#EE7526] text-lg">{formatPrice(Number(order.total_amount))}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-1">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{PAYMENT_LABELS[payMethod] ?? payMethod}</span>
              </div>
            </div>

            {/* Telegram button */}
            <div className="mt-4 flex justify-end">
              <Button variant="outline"
                className="rounded-full border-[#dbe7d8] bg-white text-[#254A34] hover:bg-[#edf4ec] text-sm"
                onClick={() => onTelegramLink("order", order.id)}
                disabled={telegramLinkLoading === order.id}>
                {telegramLinkLoading === order.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <MessageCircle className="h-4 w-4" />}
                Telegramda kuzatish
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
