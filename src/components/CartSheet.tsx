import { CreditCard, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductCard } from "@/components/ProductCard";
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

export function CartSheet({
  open,
  onOpenChange,
  cart,
  cartTotal,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onGoToCatalog,
  recommended = [],
  onAddToCart,
  isLoggedIn,
  onLogin,
}: Props) {
  const { format: formatPrice } = useCurrency();
  const { t } = useI18n();
  const suggestions = recommended.slice(0, 4);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl border-l border-neutral-200 bg-[#f5f5f5] p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-neutral-200 bg-white px-6 py-5 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-extrabold text-neutral-900">
              <ShoppingCart className="h-5 w-5 text-[#EE7526]" /> {t("cart")}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {cart.length ? (
              <>
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                    <img
                      src={item.image ?? "/assets/smartcam-outdoor-camera.png"}
                      alt={item.name}
                      onError={(e) => { e.currentTarget.src = "/assets/smartcam-outdoor-camera.png"; }}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold text-neutral-800">{item.name}</h3>
                      <p className="mt-1 text-lg font-extrabold text-neutral-900">{formatPrice(item.price)}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 transition hover:bg-white"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-7 text-center text-sm font-bold text-neutral-900">
                            {item.qty}
                          </span>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 transition hover:bg-white"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-neutral-400 transition hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              /* Bo'sh savat — AliExpress uslubida */
              <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                <h3 className="text-xl font-extrabold text-neutral-900">{t("cart_empty_title")}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-neutral-400">
                  {t("cart_empty_text")}
                </p>
                <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3">
                  {!isLoggedIn && onLogin && (
                    <Button
                      className="h-11 rounded-full bg-[#EE7526] text-sm font-semibold text-white hover:bg-[#d8661c]"
                      onClick={() => { onOpenChange(false); onLogin(); }}
                    >
                      {t("login_account")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-neutral-200 bg-neutral-100 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
                    onClick={() => { onOpenChange(false); onGoToCatalog(); }}
                  >
                    {t("to_home")}
                  </Button>
                </div>
              </div>
            )}

            {/* Sizga atab ajratib qo'yilgan — tavsiya etilgan mahsulotlar */}
            {suggestions.length > 0 && onAddToCart && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-base font-extrabold text-neutral-900">{t("for_you")}</h3>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-neutral-200">
                  {suggestions.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={(prod) => onAddToCart(prod)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-neutral-200 bg-white px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-neutral-500">{t("total_sum")}</span>
                <span className="text-2xl font-extrabold text-neutral-900">{formatPrice(cartTotal)}</span>
              </div>
              <Button
                className="h-12 w-full rounded-full bg-[#EE7526] text-base font-semibold text-white hover:bg-[#d8661c]"
                onClick={onCheckout}
              >
                <CreditCard className="h-4 w-4" />
                {t("place_order")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
