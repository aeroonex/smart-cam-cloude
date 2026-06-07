import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Trash2, Truck, Tag, ChevronRight, Sparkles } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useSessionContext } from "@/components/session-context-provider";
import { BottomNav } from "@/components/BottomNav";

const FREE_THRESHOLD = 150_000;

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();
  const { format } = useCurrency();
  const { products } = useProducts();
  const { user } = useSessionContext();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const totalQty    = cart.reduce((s, i) => s + i.qty, 0);
  const remaining   = Math.max(0, FREE_THRESHOLD - cartTotal);
  const progressPct = Math.min((cartTotal / FREE_THRESHOLD) * 100, 100);
  const isFree      = remaining === 0;

  function handleRemove(id: string) {
    setRemovingId(id);
    setTimeout(() => {
      removeFromCart(id);
      setRemovingId(null);
      toast("🗑️ Savatdan olib tashlandi");
    }, 250);
  }

  const handleCheckout = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/order");
  };

  /* ─── EMPTY STATE ─── */
  if (cart.length === 0) return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-neutral-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-neutral-100 active:scale-90 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            className="h-5 w-5 text-neutral-600">
            <path d="m12 19-7-7 7-7M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-extrabold text-[17px] text-neutral-900">Savat</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-28 w-28 rounded-[32px] bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-center mb-6 shadow-sm">
          <ShoppingBag className="h-14 w-14 text-orange-300" />
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900">Savat bo'sh</h2>
        <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
          Xarid qilishni boshlang va mahsulotlar<br/>bu yerda ko'rinadi
        </p>
        <button onClick={() => navigate("/")}
          className="mt-8 h-12 rounded-2xl px-10 text-[15px] font-bold text-white shadow-lg shadow-orange-200 active:scale-95 transition"
          style={{ background: "linear-gradient(135deg,#EE7526,#ff9a5c)" }}>
          Xaridga o'tish
        </button>
      </div>
      <BottomNav active="cart" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb]" style={{ paddingBottom: 160 }}>
      <style>{`
        @keyframes slide-out {
          to { opacity: 0; transform: translateX(60px) scale(0.95); }
        }
        .removing { animation: slide-out 0.25s ease forwards; }
      `}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-neutral-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3.5 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-neutral-100 active:scale-90 transition shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              className="h-5 w-5 text-neutral-600">
              <path d="m12 19-7-7 7-7M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-[17px] text-neutral-900 leading-tight">Savat</h1>
            <p className="text-[11px] text-neutral-400">{totalQty} ta mahsulot</p>
          </div>
          {/* Qty badge */}
          <div className="h-8 px-3 rounded-full flex items-center font-bold text-xs text-white"
            style={{ background: "linear-gradient(135deg,#EE7526,#ff9a5c)" }}>
            {totalQty} ta
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

        {/* ── Delivery progress (only when not yet free) ── */}
        {!isFree && (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "1px solid #fed7aa" }}>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 shrink-0 text-orange-400" />
                <span className="text-[13px] font-semibold text-orange-700">
                  Bepul yetkazish uchun <span className="font-extrabold">{format(remaining)}</span> qoldi
                </span>
              </div>
              <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#EE7526,#ff9a5c)" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Cart items ── */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {cart.map((item, idx) => (
            <div key={item.id}
              className={`transition-all duration-250 ${removingId === item.id ? "removing" : ""}`}>
              {idx > 0 && <div className="mx-4 h-px bg-neutral-50" />}
              <div className="flex gap-3 px-4 py-4">

                {/* Image */}
                <div onClick={() => navigate(`/product/${item.id}`)}
                  className="h-[76px] w-[76px] shrink-0 rounded-2xl overflow-hidden bg-neutral-50 cursor-pointer active:scale-95 transition border border-neutral-100">
                  <img src={item.image ?? "/placeholder.svg"} alt={item.name}
                    onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                    className="h-full w-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 text-[13px] text-neutral-700 leading-snug font-medium">{item.name}</p>
                  <p className="mt-1.5 text-[18px] font-extrabold text-neutral-900">{format(item.price)}</p>

                  <div className="mt-2.5 flex items-center justify-between">
                    {/* Qty control */}
                    <div className="flex items-center rounded-2xl overflow-hidden"
                      style={{ border: "1.5px solid #e5e7eb", background: "#fafafa" }}>
                      <button
                        onClick={() => {
                          if (item.qty === 1) { handleRemove(item.id); return; }
                          updateQuantity(item.id, -1);
                        }}
                        className="flex h-8 w-8 items-center justify-center text-neutral-600 active:scale-90 transition">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[28px] text-center text-[15px] font-bold text-neutral-900 select-none">
                        {item.qty}
                      </span>
                      <button onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center text-neutral-600 active:scale-90 transition">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Delete */}
                    <button onClick={() => handleRemove(item.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:scale-90 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Promo code ── */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Tag className="h-4 w-4 text-violet-500" />
          </div>
          <span className="flex-1 text-[13px] text-neutral-500">Promo-kod kiriting</span>
          <ChevronRight className="h-4 w-4 text-neutral-300" />
        </div>

        {/* ── Order summary ── */}
        <div className="bg-white rounded-3xl shadow-sm px-4 py-4">
          <h3 className="text-[15px] font-bold text-neutral-900 mb-3">Buyurtma xulosasi</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-neutral-500">Mahsulotlar ({totalQty} ta)</span>
              <span className="font-semibold text-neutral-800">{format(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-neutral-500">Yetkazib berish</span>
              <span className={`font-semibold ${isFree ? "text-emerald-600" : "text-neutral-400"}`}>
                {isFree ? "🎁 Bepul" : "Aniqlanadi"}
              </span>
            </div>
            <div className="pt-2.5 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-[15px] font-bold text-neutral-900">Jami</span>
              <span className="text-[20px] font-extrabold" style={{ color: "#EE7526" }}>{format(cartTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Recommended ── */}
        {products.filter(p => p.is_recommended && !cart.find(c => c.id === p.id)).length > 0 && (
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-[15px] font-bold text-neutral-900">Tavsiya etilgan</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {products
                .filter(p => p.is_recommended && !cart.find(c => c.id === p.id))
                .slice(0, 6)
                .map(product => (
                  <div key={product.id}
                    className="shrink-0 w-[140px] bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 cursor-pointer active:scale-95 transition"
                    onClick={() => navigate(`/product/${product.id}`)}>
                    <div className="h-[100px] bg-neutral-50 overflow-hidden">
                      {product.images?.[0]
                        ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-neutral-200"><ShoppingBag className="h-8 w-8" /></div>
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

      {/* ── Sticky checkout button ── */}
      <div className="fixed left-0 right-0 z-[199] px-4" style={{ bottom: 80 }}>
        <div className="max-w-lg mx-auto">
          <button onClick={handleCheckout}
            className="w-full h-[58px] rounded-2xl flex items-center justify-between px-5 active:scale-[0.98] transition"
            style={{
              background: "linear-gradient(135deg,#EE7526 0%,#ff9a5c 100%)",
              boxShadow: "0 8px 32px rgba(238,117,38,0.35), 0 2px 8px rgba(0,0,0,0.08)",
            }}>
            <div className="text-left">
              <p className="text-[11px] text-orange-100 leading-none mb-0.5">{totalQty} ta mahsulot</p>
              <p className="text-[19px] font-extrabold text-white leading-tight">{format(cartTotal)}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <span className="text-[14px] font-bold text-white">Rasmiylashtrish</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-4 w-4">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <BottomNav active="cart" cartCount={totalQty > 0 ? totalQty : undefined} />
    </div>
  );
}
