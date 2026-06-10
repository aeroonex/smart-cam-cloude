import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Minus, Plus, Search, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useSessionContext } from "@/components/session-context-provider";
import { usePromoCode } from "@/hooks/usePromoCode";
import type { CartItem } from "@/hooks/useCart";

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();
  const { format } = useCurrency();
  const { products } = useProducts();
  const { user } = useSessionContext();

  const [removeTarget, setRemoveTarget] = useState<CartItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const { loading: promoLoading, applied, error: promoError, applyCode, remove: removePromo } = usePromoCode();

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  function confirmRemove(item: CartItem) { setRemoveTarget(item); }

  function doRemove() {
    if (!removeTarget) return;
    setRemovingId(removeTarget.id);
    setTimeout(() => {
      removeFromCart(removeTarget.id);
      setRemovingId(null);
      setRemoveTarget(null);
    }, 220);
  }

  async function handleApplyPromo() {
    const ok = await applyCode(promoInput, cartTotal);
    if (ok) {
      localStorage.setItem("applied_promo", promoInput.trim().toUpperCase());
      setPromoOpen(false);
      toast.success("Promokod qo'llandi!");
    }
  }

  const discountedTotal = applied ? Math.max(0, cartTotal - applied.discountAmount) : cartTotal;

  const handleCheckout = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/order");
  };

  /* ── EMPTY STATE ── */
  if (cart.length === 0) return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F8FA" }}>
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-neutral-600">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-[20px] font-extrabold text-neutral-900">My Cart</h1>
        </div>
        <button onClick={() => navigate("/search")}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
          <Search className="h-4 w-4 text-neutral-600" />
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-24 w-24 rounded-3xl bg-[#F5F5F5] flex items-center justify-center mb-5">
          <ShoppingBag className="h-12 w-12 text-neutral-300" />
        </div>
        <h2 className="text-[22px] font-extrabold text-neutral-900">Savat bo'sh</h2>
        <p className="mt-2 text-[14px] text-neutral-400 leading-relaxed">
          Mahsulotlarni qo'shing va<br/>xaridni boshlang
        </p>
        <button onClick={() => navigate("/")}
          className="mt-7 h-13 rounded-2xl bg-neutral-900 px-10 py-3.5 text-[15px] font-bold text-white active:scale-95 transition">
          Katalogga o'tish
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-36" style={{ background: "#F7F8FA" }}>
      <style>{`
        @keyframes slide-out{to{opacity:0;transform:translateX(48px) scale(0.96)}}
        .removing{animation:slide-out 0.22s ease forwards}
      `}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-neutral-600">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-[20px] font-extrabold text-neutral-900">My Cart</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-7 px-3 rounded-full bg-neutral-900 text-white text-[12px] font-bold flex items-center">
            {totalQty} ta
          </span>
          <button onClick={() => navigate("/search")}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <Search className="h-4 w-4 text-neutral-600" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3 max-w-lg mx-auto">

        {/* ── Cart items ── */}
        {cart.map(item => (
          <div key={item.id}
            className={`bg-white rounded-3xl overflow-hidden transition-all ${removingId === item.id ? "removing" : ""}`}
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="flex gap-3 p-4">
              {/* Image */}
              <button onClick={() => navigate(`/product/${item.id}`)}
                className="h-[88px] w-[88px] shrink-0 rounded-2xl overflow-hidden bg-[#F5F5F5] active:scale-95 transition">
                <img
                  src={item.image ?? "/placeholder.svg"}
                  alt={item.name}
                  onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                  className="h-full w-full object-cover"
                />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[14px] font-semibold text-neutral-900 leading-snug flex-1">{item.name}</p>
                  <button onClick={() => confirmRemove(item)}
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-[#F5F5F5] shrink-0 active:scale-90 transition">
                    <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                </div>

                <p className="text-[12px] text-neutral-400 mt-1">Mahsulot · {item.qty} dona</p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[17px] font-extrabold text-neutral-900">{format(item.price)}</p>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (item.qty === 1) { confirmRemove(item); return; }
                        updateQuantity(item.id, -1);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-[#F5F5F5] active:scale-90 transition">
                      <Minus className="h-3.5 w-3.5 text-neutral-600" />
                    </button>
                    <span className="min-w-[28px] text-center text-[15px] font-bold text-neutral-900 select-none">
                      {item.qty}
                    </span>
                    <button onClick={() => updateQuantity(item.id, 1)}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-900 active:scale-90 transition">
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── Promo code ── */}
        {applied ? (
          <div className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-neutral-900">{applied.code.code}</p>
                <p className="text-[11px] text-green-600 font-semibold">
                  -{format(applied.discountAmount)} chegirma
                </p>
              </div>
            </div>
            <button onClick={() => { removePromo(); localStorage.removeItem("applied_promo"); }}
              className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center active:scale-90 transition">
              <X className="h-3.5 w-3.5 text-neutral-500" />
            </button>
          </div>
        ) : (
          <button className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-neutral-50 transition"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            onClick={() => setPromoOpen(true)}>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-neutral-400" />
              <span className="text-[14px] text-neutral-400">Promo-kod kiriting</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-neutral-300">
              <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* ── Order summary ── */}
        <div className="bg-white rounded-3xl px-4 py-4"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 className="text-[16px] font-extrabold text-neutral-900 mb-3">Buyurtma xulosasi</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-[14px]">
              <span className="text-neutral-400">Mahsulotlar ({totalQty} ta)</span>
              <span className="font-semibold text-neutral-800">{format(cartTotal)}</span>
            </div>
            {applied && (
              <div className="flex justify-between text-[14px]">
                <span className="text-green-600">Chegirma ({applied.code.code})</span>
                <span className="font-semibold text-green-600">−{format(applied.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px]">
              <span className="text-neutral-400">Yetkazib berish</span>
              <span className="font-semibold text-neutral-400">—</span>
            </div>
            <div className="pt-3 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-[16px] font-extrabold text-neutral-900">Jami</span>
              <span className="text-[20px] font-extrabold text-neutral-900">{format(discountedTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Recommended ── */}
        {products.filter(p => p.is_recommended && !cart.find(c => c.id === p.id)).length > 0 && (
          <div className="pt-1">
            <h3 className="text-[15px] font-extrabold text-neutral-900 mb-3">Tavsiya etilgan</h3>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {products
                .filter(p => p.is_recommended && !cart.find(c => c.id === p.id))
                .slice(0, 6)
                .map(product => (
                  <div key={product.id}
                    className="shrink-0 w-[140px] bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition"
                    style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}
                    onClick={() => navigate(`/product/${product.id}`)}>
                    <div className="h-[100px] bg-[#F5F5F5] overflow-hidden">
                      {product.images?.[0]
                        ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-neutral-200" /></div>
                      }
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-[11px] text-neutral-600 leading-snug">{product.name}</p>
                      <p className="mt-1 text-[13px] font-extrabold text-neutral-900">{format(Number(product.price))}</p>
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <AddToCartButton product={product} onAddToCart={() => {}} size="sm" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 px-4 py-3"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] text-neutral-400 leading-none mb-0.5">Total price</p>
            <p className="text-[22px] font-extrabold text-neutral-900 leading-tight">{format(discountedTotal)}</p>
          </div>
          <button onClick={handleCheckout}
            className="flex-1 h-13 max-w-[200px] rounded-2xl bg-neutral-900 flex items-center justify-center gap-2 active:scale-[0.97] transition py-3.5">
            <span className="text-[15px] font-bold text-white">Checkout</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-4 w-4">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Promo code modal ── */}
      {promoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setPromoOpen(false); }}>
          <div className="w-full max-w-lg bg-white rounded-3xl px-5 pt-5 pb-7 space-y-4"
            style={{ animation: "fadein .2s ease" }}>
            <style>{`@keyframes fadein{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold text-neutral-900">Promo-kod</h2>
              <button onClick={() => setPromoOpen(false)}
                className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center">
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                placeholder="Masalan: SAVE20"
                autoFocus
                className="flex-1 h-12 rounded-2xl bg-neutral-50 border border-neutral-200 px-4 text-[15px] font-bold tracking-widest text-neutral-900 focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300 placeholder:font-normal placeholder:tracking-normal"
              />
              <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()}
                className="h-12 px-5 rounded-2xl bg-neutral-900 text-white font-bold text-[14px] disabled:opacity-40 active:scale-95 transition">
                {promoLoading ? "..." : "Qo'lla"}
              </button>
            </div>
            {promoError && (
              <p className="text-[13px] text-red-500 font-medium">{promoError}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Remove confirm modal ── */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setRemoveTarget(null); }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10"
            style={{ animation: "slidein .28s cubic-bezier(.22,1,.36,1)" }}>
            <style>{`@keyframes slidein{from{transform:translateY(100%)}to{transform:none}}`}</style>

            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-5" />

            <h2 className="text-[20px] font-extrabold text-neutral-900 text-center mb-5">
              Remove From Cart?
            </h2>

            {/* Item preview */}
            <div className="flex gap-3 items-center bg-[#F7F8FA] rounded-2xl p-3 mb-6">
              <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-[#F0F0F0]">
                <img
                  src={removeTarget.image ?? "/placeholder.svg"}
                  alt={removeTarget.name}
                  onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-neutral-900 line-clamp-2">{removeTarget.name}</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{removeTarget.qty} × {format(removeTarget.price)}</p>
                <p className="text-[15px] font-extrabold text-neutral-900 mt-0.5">{format(removeTarget.price * removeTarget.qty)}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setRemoveTarget(null)}
                className="flex-1 h-13 rounded-2xl bg-[#F5F5F5] text-neutral-700 font-semibold text-[15px] active:scale-[0.97] transition py-3.5">
                Cancel
              </button>
              <button onClick={doRemove}
                className="flex-1 h-13 rounded-2xl bg-neutral-900 text-white font-semibold text-[15px] active:scale-[0.97] transition py-3.5">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
