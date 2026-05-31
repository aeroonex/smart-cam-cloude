import { Heart, ShoppingCart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  product: Product;
  onAddToCart: (product: Product) => void;
  inWishlist?: boolean;
  onToggleWishlist?: (product: Product) => void;
};

function hashNum(id: string, salt: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

function getDiscount(id: string): number | null {
  const v = hashNum(id, 7) % 60;
  return v < 10 ? null : v;
}

function getRating(id: string) {
  return (4.1 + (hashNum(id, 3) % 9) / 10).toFixed(1);
}

function getSold(id: string) {
  const v = hashNum(id, 13) % 2000;
  return v < 50 ? 50 + v : v;
}

export function ProductCard({
  product,
  onAddToCart,
  inWishlist = false,
  onToggleWishlist,
}: Props) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const { t } = useI18n();

  const img = product.images?.[0] ?? null;
  const discount = getDiscount(product.id);
  const originalPrice = discount
    ? Math.round(Number(product.price) / (1 - discount / 100))
    : null;
  const rating = getRating(product.id);
  const sold = product.sold_count > 0 ? product.sold_count : getSold(product.id);
  const outOfStock = product.stock_count === 0;

  return (
    <article
      className="group relative flex cursor-pointer flex-col rounded-2xl bg-white overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* ── IMAGE ── */}
      <div className="relative aspect-square overflow-hidden bg-[#f7f7f7]">
        {img ? (
          <img
            src={img}
            alt={product.name}
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
              outOfStock ? "opacity-50" : ""
            }`}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-50">
            <ShoppingCart className="h-10 w-10 text-orange-200" />
          </div>
        )}

        {/* Tugadi overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-xl bg-black/60 px-3 py-1 text-xs font-bold text-white">
              Tugadi
            </span>
          </div>
        )}

        {/* Discount badge — top left */}
        {discount && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            -{discount}%
          </span>
        )}

        {/* Wishlist — top right */}
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
            toast.success(
              inWishlist ? t("removed_from_wishlist") : t("added_to_wishlist")
            );
          }}
        >
          <Heart
            className={`h-4 w-4 ${
              inWishlist ? "fill-red-500 text-red-500" : "text-neutral-400"
            }`}
          />
        </button>
      </div>

      {/* ── INFO ── */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        {/* Product name */}
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-800">
          {product.name}
        </p>

        {/* Price row */}
        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-neutral-900">
            {formatPrice(Number(product.price))}
          </span>
          {discount && originalPrice && (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-[12px] font-semibold text-neutral-700">
            {rating}
          </span>
          <span className="text-[11px] text-neutral-400">
            ({sold > 999 ? (sold / 1000).toFixed(1) + "k" : sold})
          </span>
        </div>

        {/* Add to cart button */}
        {!outOfStock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
              toast.success("Savatga qo'shildi");
            }}
            className="mt-1.5 w-full rounded-xl bg-[#EE7526] py-2 text-[12px] font-bold text-white transition hover:bg-[#d8661c] active:scale-95"
          >
            {t("add_to_cart")}
          </button>
        )}
      </div>
    </article>
  );
}
