import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { CartItemSkeleton } from "@/components/Skeleton";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useSessionContext } from "@/components/session-context-provider";

const FREE_THRESHOLD = 150_000;

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();
  const { format } = useCurrency();
  const { products } = useProducts();
  const { user } = useSessionContext();

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const remaining = Math.max(0, FREE_THRESHOLD - cartTotal);
  const progressPct = Math.min((cartTotal / FREE_THRESHOLD) * 100, 100);

  const handleCheckout = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/checkout");
  };

  return (
    <PageLayout
      title={cart.length > 0 ? `Savat · ${totalQty} ta` : "Savat"}
    >
      {cart.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-neutral-100">
            <ShoppingBag className="h-14 w-14 text-neutral-300" />
          </div>
          <h2 className="text-xl font-extrabold text-neutral-900">Savat bo'sh</h2>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            Xarid qilishni boshlang va mahsulotlar<br />bu yerda ko'rinadi
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-8 rounded-2xl bg-[#EE7526] px-8 py-3.5 text-[15px] font-bold text-white shadow-md shadow-orange-200 active:scale-95 transition"
          >
            Xaridga o'tish
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-0">

          {/* Delivery progress */}
          <div className="mx-4 mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
            {remaining > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#EE7526]" />
                    <span className="text-[13px] font-semibold text-neutral-800">Bepul yetkazish</span>
                  </div>
                  <span className="text-[12px] text-neutral-400">{format(remaining)} qoldi</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#EE7526,#ff9a5c)" }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-[13px] font-semibold text-emerald-600">Bepul yetkazib berish mavjud! 🎉</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
            {cart.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <div className="mx-4 h-px bg-neutral-50" />}
                <div className="flex gap-3 px-4 py-4">
                  {/* Image */}
                  <div
                    onClick={() => navigate(`/product/${item.id}`)}
                    className="h-[80px] w-[80px] shrink-0 overflow-hidden rounded-2xl bg-neutral-50 cursor-pointer active:scale-95 transition"
                  >
                    <img
                      src={item.image ?? "/placeholder.svg"}
                      alt={item.name}
                      onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-[13px] text-neutral-700 leading-snug">{item.name}</p>
                    <p className="mt-1.5 text-[17px] font-extrabold text-neutral-900">{format(item.price)}</p>
                    <p className="text-[11px] text-neutral-400">{format(item.price)} / dona</p>

                    {/* Controls */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center rounded-2xl border border-neutral-200 overflow-hidden">
                        <button
                          onClick={() => {
                            updateQuantity(item.id, -1);
                            if (item.qty === 1) toast("Savatdan olib tashlandi");
                          }}
                          className="flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-50 active:scale-90 transition"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[32px] text-center text-[15px] font-bold text-neutral-900 select-none">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-50 active:scale-90 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => { removeFromCart(item.id); toast("Savatdan olib tashlandi"); }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-400 active:scale-90 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mx-4 mt-3 rounded-2xl bg-white shadow-sm px-4 py-4 space-y-2.5">
            <h3 className="text-[15px] font-bold text-neutral-900">Buyurtma xulosasi</h3>
            <div className="flex justify-between text-[13px] text-neutral-500">
              <span>Mahsulotlar ({totalQty} ta)</span>
              <span className="font-semibold text-neutral-800">{format(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-neutral-500">
              <span>Yetkazib berish</span>
              <span className={`font-semibold ${remaining === 0 ? "text-emerald-600" : "text-neutral-800"}`}>
                {remaining === 0 ? "Bepul" : "Aniqlanadi"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-100">
              <span className="text-[15px] font-bold text-neutral-900">Jami</span>
              <span className="text-[18px] font-extrabold text-[#EE7526]">{format(cartTotal)}</span>
            </div>
          </div>

          {/* Recommended */}
          {products.filter(p => p.is_recommended && !cart.find(c => c.id === p.id)).length > 0 && (
            <div className="mx-4 mt-3 mb-2">
              <h3 className="text-[15px] font-bold text-neutral-900 mb-3">Tavsiya etilgan</h3>
              <div className="grid grid-cols-2 gap-3">
                {products
                  .filter(p => p.is_recommended && !cart.find(c => c.id === p.id))
                  .slice(0, 4)
                  .map(product => (
                    <div
                      key={product.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-sm cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="aspect-square overflow-hidden bg-neutral-50">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[12px] text-neutral-700">{product.name}</p>
                        <p className="mt-1 text-[13px] font-bold text-neutral-900">{format(Number(product.price))}</p>
                        <div className="mt-2">
                          <AddToCartButton product={product} onAddToCart={() => {}} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      )}

      {/* Sticky checkout — nav ustida, scroll qilinsa ham doim ko'rinadi */}
      {cart.length > 0 && (
        <div className="fixed left-0 right-0 z-[199] px-4" style={{ bottom: "84px" }}>
          <div className="mx-auto max-w-lg">
            <div
              className="rounded-2xl overflow-hidden shadow-xl"
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.65)",
                boxShadow: "0 8px 32px rgba(238,117,38,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[11px] text-neutral-400 leading-none mb-0.5">
                    {cart.reduce((s, i) => s + i.qty, 0)} ta mahsulot
                  </p>
                  <p className="text-[19px] font-extrabold text-[#EE7526] leading-tight">
                    {format(cartTotal)}
                  </p>
                </div>
                <button
                  onClick={handleCheckout}
                  className="rounded-xl px-6 py-3 text-[14px] font-bold text-white active:scale-95 transition"
                  style={{ background: "linear-gradient(135deg,#EE7526,#ff9a5c)" }}
                >
                  Rasmiylashtrish →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
