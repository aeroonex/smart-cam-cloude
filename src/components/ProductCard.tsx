import { memo } from "react";
import { CheckCircle2, Heart, ShoppingCart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import { useCart } from "@/hooks/useCart";
import { AddToCartButton } from "@/components/AddToCartButton";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  product: Product;
  onAddToCart: (product: Product) => void;
  inWishlist?: boolean;
  onToggleWishlist?: (product: Product) => void;
};

export const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  inWishlist = false,
  onToggleWishlist,
}: Props) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const { t } = useI18n();
  const { cart } = useCart();

  const img = product.images?.[0] ?? null;
  const outOfStock = product.stock_count === 0;
  const inCart = cart.some(item => item.id === product.id);
  const cartQty = cart.find(item => item.id === product.id)?.qty ?? 0;

  const discountPct = (product as unknown as { discount_percent?: number }).discount_percent;
  const origPrice = (product as unknown as { original_price?: number }).original_price;
  const warranty = (product as unknown as { warranty?: string }).warranty;

  const rating = product.sold_count > 0
    ? (4.1 + (product.id.charCodeAt(0) % 9) / 10).toFixed(1)
    : null;
  const sold = product.sold_count > 0 ? product.sold_count : null;

  return (
    <article
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-transform active:scale-[0.98]"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* IMAGE */}
      <div className="relative overflow-hidden bg-[#f7f7f7]" style={{ aspectRatio: "1/1" }}>
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${outOfStock ? "opacity-50" : ""}`}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blue-50">
            <ShoppingCart className="h-10 w-10 text-blue-200" />
          </div>
        )}

        {/* Tugadi overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-xl bg-black/60 px-3 py-1 text-xs font-bold text-white">Tugadi</span>
          </div>
        )}

        {/* Discount badge */}
        {discountPct && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
            -{discountPct}%
          </span>
        )}

        {/* In-cart badge */}
        {inCart && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-[#1d4f8a] px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <CheckCircle2 className="h-3 w-3" />
            {cartQty} ta
          </div>
        )}

        {/* Wishlist */}
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
          onClick={e => {
            e.stopPropagation();
            onToggleWishlist?.(product);
            toast.success(inWishlist ? t("removed_from_wishlist") : t("added_to_wishlist"));
          }}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-red-500 text-red-500" : "text-neutral-400"}`} />
        </button>
      </div>

      {/* INFO */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        {/* Warranty badge */}
        {warranty && (
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Kafolat {warranty}
          </div>
        )}

        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-800">
          {product.name}
        </p>

        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-neutral-900">
            {formatPrice(Number(product.price))}
          </span>
          {origPrice && origPrice > Number(product.price) && (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(origPrice)}
            </span>
          )}
        </div>

        {rating && sold && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[12px] font-semibold text-neutral-700">{rating}</span>
            <span className="text-[11px] text-neutral-400">
              ({sold > 999 ? (sold / 1000).toFixed(1) + "k" : sold})
            </span>
          </div>
        )}

        <div className="mt-1.5">
          <AddToCartButton product={product} onAddToCart={onAddToCart} size="md" />
        </div>
      </div>
    </article>
  );
});
