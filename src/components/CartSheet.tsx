import { Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import type { CartItem } from "@/hooks/useCart";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onGoToCatalog: () => void;
  recommended?: Product[];
  onAddToCart?: (product: Product) => void;
  isLoggedIn?: boolean;
  onLogin?: () => void;
};

const BLUE = "#1d4f8a";
const FREE_THRESHOLD = 150_000;

export function CartSheet({
  open,
  onOpenChange,
  cart,
  cartTotal,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onGoToCatalog,
  isLoggedIn,
  onLogin,
}: Props) {
  const { format } = useCurrency();
  const { t } = useI18n();

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  // Har xil provayderlar uchun bir martadan to'lov (unique providers)
  const deliveryFee = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const item of cart) {
      if (item.delivery_provider_id && !seen.has(item.delivery_provider_id)) {
        seen.add(item.delivery_provider_id);
        total += item.delivery_provider_fee ?? 0;
      }
    }
    return total;
  })();

  const grandTotal = cartTotal + deliveryFee;
  const progressPct = Math.min((cartTotal / FREE_THRESHOLD) * 100, 100);
  const remaining = Math.max(0, FREE_THRESHOLD - cartTotal);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-0 bg-white p-0 flex flex-col shadow-2xl sm:max-w-md [&>button:last-of-type]:hidden pb-24"
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f4fa] text-[#1d4f8a] transition hover:bg-[#dce8f7]"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-[17px] font-bold text-neutral-900">Savat</h1>
            {cart.length > 0 && (
              <span className="text-xs text-neutral-400 mt-0.5">{totalQty} ta mahsulot</span>
            )}
          </div>
          {/* right spacer */}
          <div className="w-9" />
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto">
          {cart.length > 0 ? (
            <div className="flex flex-col gap-0">

              {/* Delivery progress strip */}
              <div className="mx-4 mb-3 rounded-2xl bg-[#f0f4fa] px-4 py-3">
                {remaining > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-[#1d4f8a]" />
                        <span className="text-[12px] font-semibold text-[#1d4f8a]">Bepul yetkazish</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">{format(remaining)} qoldi</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, background: BLUE }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[13px] font-semibold text-emerald-700">Sizda bepul yetkazib berish bor!</span>
                  </div>
                )}
              </div>

              {/* Cart items */}
              <div className="flex flex-col divide-y divide-[#f0f4fa] px-4">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemove}
                    formatPrice={format}
                  />
                ))}
              </div>

              {/* Order summary */}
              <div className="mx-4 mt-4 rounded-2xl bg-[#f0f4fa] overflow-hidden">
                <div className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-500">Mahsulotlar ({totalQty} ta)</span>
                    <span className="font-semibold text-neutral-800">{format(cartTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-500">Yetkazib berish</span>
                    <span className={`font-semibold ${deliveryFee === 0 ? "text-emerald-600" : "text-neutral-800"}`}>
                      {deliveryFee === 0 ? "Bepul" : format(deliveryFee)}
                    </span>
                  </div>
                  {/* Per-provider breakdown */}
                  {deliveryFee > 0 && (() => {
                    const seen = new Set<string>();
                    const lines: { name: string; fee: number }[] = [];
                    for (const item of cart) {
                      if (item.delivery_provider_id && !seen.has(item.delivery_provider_id)) {
                        seen.add(item.delivery_provider_id);
                        lines.push({ name: item.delivery_provider_name ?? "Kuryer", fee: item.delivery_provider_fee ?? 0 });
                      }
                    }
                    return lines.map(l => (
                      <div key={l.name} className="flex items-center justify-between text-[12px] pl-3">
                        <span className="text-neutral-400">· {l.name}</span>
                        <span className="text-neutral-500">{l.fee === 0 ? "Bepul" : format(l.fee)}</span>
                      </div>
                    ));
                  })()}
                  <div className="pt-2 border-t border-[#dce8f7] flex items-center justify-between">
                    <span className="text-[14px] font-bold text-neutral-900">Jami</span>
                    <span className="text-[18px] font-extrabold" style={{ color: BLUE }}>
                      {format(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-6" />
            </div>
          ) : (
            /* ── EMPTY STATE ── */
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: "#f0f4fa" }}
              >
                <ShoppingBag className="h-11 w-11" style={{ color: BLUE, opacity: 0.7 }} />
              </div>
              <h3 className="text-[20px] font-extrabold text-neutral-900 leading-snug">
                Savat bo'sh
              </h3>
              <p className="mt-2 text-[13px] text-neutral-400 leading-relaxed max-w-[220px]">
                Mahsulotlarni qo'shib, qulay xarid qiling
              </p>

              <div className="mt-8 w-full flex flex-col gap-3">
                {!isLoggedIn && onLogin && (
                  <button
                    onClick={() => { onOpenChange(false); onLogin(); }}
                    className="h-12 w-full rounded-2xl text-[14px] font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
                    style={{ background: BLUE }}
                  >
                    Kirish
                  </button>
                )}
                <button
                  onClick={() => { onOpenChange(false); onGoToCatalog(); }}
                  className="h-12 w-full rounded-2xl border border-[#dce8f7] bg-[#f0f4fa] text-[14px] font-semibold text-[#1d4f8a] transition hover:bg-[#dce8f7] active:scale-[0.98]"
                >
                  Mahsulotlarni ko'rish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── STICKY CHECKOUT ── */}
        {cart.length > 0 && (
          <div className="px-4 pb-5 pt-3 bg-white border-t border-[#f0f4fa]">
            <button
              onClick={onCheckout}
              className="h-14 w-full rounded-2xl text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.98] shadow-lg shadow-[#1d4f8a33]"
              style={{ background: `linear-gradient(135deg, #2860a8, ${BLUE})` }}
            >
              Rasmiylashtirish · {format(grandTotal)}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  formatPrice,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  formatPrice: (n: number) => string;
}) {
  return (
    <div className="flex gap-3 py-4">
      {/* Image */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f0f4fa]">
        <img
          src={item.image ?? "/placeholder.svg"}
          alt={item.name}
          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[13px] leading-snug text-neutral-700 flex-1">{item.name}</p>
          <button
            onClick={() => onRemove(item.id)}
            className="shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center rounded-full text-neutral-300 hover:text-red-400 hover:bg-red-50 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-[16px] font-extrabold text-neutral-900 leading-none">
          {formatPrice(item.price * item.qty)}
        </span>
        {item.qty > 1 && (
          <span className="text-[11px] text-neutral-400">{formatPrice(item.price)} × {item.qty}</span>
        )}

        {/* Qty counter */}
        <div className="mt-1 flex items-center gap-0 self-start rounded-xl overflow-hidden border border-[#dce8f7]">
          <button
            onClick={() => onUpdateQuantity(item.id, -1)}
            className="flex h-8 w-8 items-center justify-center text-[#1d4f8a] hover:bg-[#f0f4fa] transition font-bold"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[28px] text-center text-[14px] font-bold text-neutral-900 select-none">
            {item.qty}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="flex h-8 w-8 items-center justify-center text-[#1d4f8a] hover:bg-[#f0f4fa] transition font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
