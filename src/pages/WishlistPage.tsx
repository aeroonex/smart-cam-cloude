import { Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { WishlistSkeleton } from "@/components/Skeleton";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useSessionContext } from "@/components/session-context-provider";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const { wishlistIds, toggleWishlist, inWishlist } = useWishlist(user);
  const { products, loading } = useProducts();
  const { format } = useCurrency();
  const { addToCart } = useCart();

  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  if (loading) return (
    <PageLayout title="Sevimlilar">
      <WishlistSkeleton />
    </PageLayout>
  );

  return (
    <PageLayout
      title="Sevimlilar"
      right={
        wishlistIds.length > 0 ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-500">
            {wishlistIds.length}
          </span>
        ) : undefined
      }
    >
      {wishlistIds.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="mb-6 relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-50">
              <Heart className="h-14 w-14 text-red-200" />
            </div>
            <div className="absolute -right-1 -top-1 h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">0</span>
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-neutral-900">Hali sevimli yo'q</h2>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            Mahsulot kartochkasidagi ♡ belgisini<br />bosib sevimlilaringizga qo'shing
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-8 rounded-2xl bg-red-500 px-8 py-3.5 text-[15px] font-bold text-white shadow-md shadow-red-200 active:scale-95 transition"
          >
            Mahsulotlarga o'tish
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4">
          {/* Stats */}
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="text-[13px] text-neutral-500">{wishlistIds.length} ta mahsulot sevimlilar ro'yxatida</span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3">
            {wishlistProducts.map(product => {
              const img = product.images?.[0];
              const discountPct = (product as any).discount_percent;
              const origPrice = (product as any).original_price;
              const outOfStock = product.stock_count === 0;

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm cursor-pointer active:scale-[0.98] transition"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-neutral-50">
                    {img ? (
                      <img src={img} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingCart className="h-10 w-10 text-neutral-200" />
                      </div>
                    )}

                    {discountPct && !outOfStock && (
                      <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        -{discountPct}%
                      </span>
                    )}

                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="rounded-xl bg-black/60 px-3 py-1 text-xs font-bold text-white">Tugadi</span>
                      </div>
                    )}

                    {/* Remove from wishlist */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleWishlist(product.id);
                        toast("Sevimlilardan olib tashlandi");
                      }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm active:scale-90 transition"
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="line-clamp-2 text-[12px] leading-snug text-neutral-700 mb-1.5">
                      {product.name}
                    </p>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-[15px] font-extrabold text-neutral-900">
                        {format(Number(product.price))}
                      </span>
                      {origPrice && origPrice > Number(product.price) && (
                        <span className="text-[11px] text-neutral-400 line-through">
                          {format(origPrice)}
                        </span>
                      )}
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <AddToCartButton product={product} onAddToCart={addToCart} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-4" />
        </div>
      )}
    </PageLayout>
  );
}
