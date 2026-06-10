import { memo } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { track } from "@/utils/analytics";
import { useCurrency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import { useCart } from "@/hooks/useCart";
import { normalizeImageUrl } from "@/utils/imageUrl";
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

  const discountPct = (product as unknown as { discount_percent?: number }).discount_percent;
  const origPrice = (product as unknown as { original_price?: number }).original_price;

  const rating = product.sold_count > 0
    ? (4.1 + (product.id.charCodeAt(0) % 9) / 10).toFixed(1)
    : null;
  const sold = product.sold_count > 0 ? product.sold_count : null;

  return (
    <article
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white transition-transform active:scale-[0.98]"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
      onClick={() => {
        track("product_view", { product_id: product.id });
        navigate(`/product/${product.id}`);
      }}
    >
      {/* IMAGE */}
      <div className="relative overflow-hidden bg-[#F5F5F5]" style={{ aspectRatio: "1/1" }}>
        {img ? (
          <img
            src={normalizeImageUrl(img)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${outOfStock ? "opacity-40" : ""}`}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5]">
            <ShoppingCart className="h-10 w-10 text-neutral-300" />
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-xl bg-black/60 px-3 py-1 text-xs font-bold text-white">Tugadi</span>
          </div>
        )}

        {/* Discount badge */}
        {discountPct && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
            -{discountPct}%
          </span>
        )}

        {/* Wishlist button */}
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"
          onClick={e => {
            e.stopPropagation();
            onToggleWishlist?.(product);
            toast.success(inWishlist ? t("removed_from_wishlist") : t("added_to_wishlist"));
          }}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? "fill-red-500 text-red-500" : "text-neutral-400"}`} />
        </button>
      </div>

      {/* INFO */}
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
        {/* Rating row */}
        {rating && sold && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-semibold text-neutral-700">{rating}</span>
            <span className="text-[11px] text-neutral-400">
              ({sold > 999 ? (sold / 1000).toFixed(1) + "k" : sold} sotildi)
            </span>
          </div>
        )}

        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-800">
          {product.name}
        </p>

        {/* Price + cart button row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div>
            <p className="text-[15px] font-extrabold text-neutral-900">
              {formatPrice(Number(product.price))}
            </p>
            {origPrice && origPrice > Number(product.price) && (
              <p className="text-[11px] text-neutral-400 line-through">
                {formatPrice(origPrice)}
              </p>
            )}
          </div>

          {/* Add to cart "+" button */}
          <button
            disabled={outOfStock}
            onClick={e => {
              e.stopPropagation();
              if (outOfStock) return;
              onAddToCart(product);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold transition active:scale-90 ${
              inCart
                ? "bg-neutral-900 text-white"
                : outOfStock
                ? "bg-neutral-200 text-neutral-400"
                : "bg-neutral-900 text-white hover:bg-neutral-700"
            }`}
          >
            {inCart ? "✓" : "+"}
          </button>
        </div>
      </div>
    </article>
  );
});
