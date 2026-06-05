import { useRef, useState } from "react";
import { ArrowLeft, Camera, ShoppingCart, Sparkles, Upload, X, Zap } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Stage = "idle" | "generating" | "result";

type Props = {
  products: Product[];
  onClose: () => void;
};

/* Evenly distribute cards around full circle */
function getOrbitStyle(index: number, total: number, radius: number) {
  const angleDeg = (360 / total) * index - 90; // start from top
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(angleRad) * radius;
  const y = Math.sin(angleRad) * radius;
  return { x, y };
}

const GEN_STEPS = [
  "Rasmingiz tahlil qilinmoqda...",
  "Tana o'lchami aniqlanmoqda...",
  "Yuzingiz saqlanmoqda...",
  "Kiyim moslamoqda...",
  "Natija yaratilmoqda...",
];

export function AITryOn({ products, onClose }: Props) {
  const { cart } = useCart();
  const { format } = useCurrency();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [genStep, setGenStep] = useState(0);

  // Only cart items
  const cartProducts = cart
    .map(ci => products.find(p => p.id === ci.id))
    .filter((p): p is Product => !!p);

  const isEmpty = cartProducts.length === 0;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserPhoto(URL.createObjectURL(file));
    setStage("idle");
    setResultImg(null);
  };

  const handleGenerate = async () => {
    if (!userPhoto) { fileRef.current?.click(); return; }
    setStage("generating");
    setGenStep(0);
    for (let i = 0; i < GEN_STEPS.length; i++) {
      setGenStep(i);
      await new Promise(r => setTimeout(r, 950));
    }
    setResultImg(userPhoto);
    setStage("result");
  };

  const reset = () => {
    setUserPhoto(null);
    setSelectedProduct(null);
    setStage("idle");
    setResultImg(null);
    setGenStep(0);
  };

  const ORBIT_R = 120;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 30%, #1e0a3c 0%, #0d0d18 60%, #070710 100%)" }}>

      {/* Stars background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `star-twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 backdrop-blur-sm text-white/70 hover:bg-white/15 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-[18px] font-bold text-white tracking-wide">
              Onex<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span>
            </span>
          </div>
          <span className="text-[10px] text-white/30 tracking-widest uppercase mt-0.5">Virtual Try‑On</span>
        </div>

        <button onClick={reset} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 backdrop-blur-sm text-white/70 hover:bg-white/15 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">

        {/* ── IDLE ── */}
        {stage === "idle" && (
          <>
            {isEmpty ? (
              /* Empty cart state */
              <div className="flex flex-col items-center gap-4 px-8 text-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <ShoppingCart className="h-12 w-12 text-white/20" />
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">0</div>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Savat bo'sh</p>
                  <p className="mt-1.5 text-sm text-white/40 leading-relaxed">
                    Kiyimlarni savatga qo'shing,<br />so'ng AI bilan sinab ko'ring
                  </p>
                </div>
                <button onClick={onClose}
                  className="mt-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-6 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 transition">
                  Katalogga o'tish
                </button>
              </div>
            ) : (
              /* Orbit scene */
              <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>

                {/* Glow under center */}
                <div className="absolute rounded-full opacity-30 blur-3xl" style={{ width: 160, height: 160, background: "radial-gradient(circle, #7c3aed, transparent)" }} />

                {/* Orbit ring */}
                <div className="absolute inset-0 rounded-full border border-white/6" />
                <div className="absolute rounded-full border border-dashed border-violet-500/20"
                  style={{ inset: -16, animation: "spin-slow 20s linear infinite" }} />

                {/* Orbiting product cards */}
                {cartProducts.map((p, i) => {
                  const { x, y } = getOrbitStyle(i, cartProducts.length, ORBIT_R);
                  const img = p.images?.[0];
                  const isSelected = selectedProduct?.id === p.id;
                  const speed = 18 + i * 3;
                  return (
                    <button key={p.id} onClick={() => setSelectedProduct(isSelected ? null : p)}
                      className="absolute z-10 transition-transform duration-300"
                      style={{ transform: `translate(${x}px, ${y}px)` }}>
                      <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg ${
                        isSelected
                          ? "border-violet-400 shadow-violet-500/60 scale-115 ring-2 ring-violet-400/30"
                          : "border-white/10 hover:border-violet-400/50 hover:scale-105"
                      }`} style={{ width: 58, height: 70 }}>
                        {img
                          ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center bg-white/5 text-xl">👕</div>
                        }
                        {/* Overlay on selected */}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-violet-600/40">
                            <Sparkles className="h-5 w-5 text-white drop-shadow" />
                          </div>
                        )}
                        {/* Price tag */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-2">
                          <p className="text-[8px] font-bold text-white text-center leading-none truncate">
                            {(Number(p.price) / 1000).toFixed(0)}k
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Center — photo upload */}
                <button onClick={() => fileRef.current?.click()}
                  className="relative z-20 flex flex-col items-center justify-center rounded-full border border-violet-500/40 bg-white/5 backdrop-blur-md shadow-2xl transition hover:border-violet-400 hover:bg-white/10 active:scale-95"
                  style={{ width: 108, height: 108, boxShadow: "0 0 40px rgba(124,58,237,0.25), inset 0 0 20px rgba(124,58,237,0.1)" }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="you" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-7 w-7 text-violet-400" />
                      <span className="mt-1 text-[9px] font-medium text-violet-300/80 text-center leading-tight px-2">
                        Rasmingizni<br />yuklang
                      </span>
                    </>
                  )}
                  {/* Upload badge */}
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-violet-600 shadow-lg">
                    <Upload className="h-3 w-3 text-white" />
                  </div>
                </button>
              </div>
            )}

            {/* Selected product chip */}
            {selectedProduct && (
              <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-violet-500/20 bg-white/5 backdrop-blur-sm px-4 py-2.5 mx-6">
                <div className="h-10 w-10 overflow-hidden rounded-xl shrink-0">
                  {selectedProduct.images?.[0]
                    ? <img src={selectedProduct.images[0]} className="h-full w-full object-cover" />
                    : <div className="h-full w-full bg-white/10 flex items-center justify-center">👕</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white line-clamp-1">{selectedProduct.name}</p>
                  <p className="text-[11px] text-violet-300 mt-0.5">{format(Number(selectedProduct.price))}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="shrink-0 text-white/30 hover:text-white/70">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Hint text */}
            {!isEmpty && (
              <div className="mt-4 text-center px-6">
                <p className="text-[13px] font-medium text-white/70">
                  {!userPhoto && !selectedProduct && "Kartochkani bosib kiyim tanlang"}
                  {userPhoto && !selectedProduct && "Endi kartochkani bosib kiyim tanlang"}
                  {!userPhoto && selectedProduct && "Markazni bosib rasmingizni yuklang"}
                  {userPhoto && selectedProduct && "Hammasi tayyor — generatsiya qiling! ✨"}
                </p>
                <p className="text-[11px] text-white/25 mt-1">AI yuzingizni saqlab kiyimni kiydiradi</p>
              </div>
            )}
          </>
        )}

        {/* ── GENERATING ── */}
        {stage === "generating" && (
          <div className="flex flex-col items-center gap-8 px-8">
            {/* Pulsing rings with photo */}
            <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="absolute inset-0 rounded-full border border-violet-500/30"
                  style={{
                    animation: `pulse-ring 2s ease-out infinite`,
                    animationDelay: `${i * 0.65}s`,
                    transform: `scale(${1 + i * 0.12})`,
                  }} />
              ))}
              {userPhoto && (
                <img src={userPhoto} alt="you"
                  className="h-24 w-24 rounded-full object-cover border-2 border-violet-400/50 shadow-lg shadow-violet-500/30" />
              )}
              {selectedProduct?.images?.[0] && (
                <div className="absolute -right-2 -top-2 h-14 w-14 overflow-hidden rounded-2xl border-2 border-violet-400 shadow-lg"
                  style={{ animation: "float 3s ease-in-out infinite" }}>
                  <img src={selectedProduct.images[0]} className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" style={{ animation: "bounce 1s infinite" }} />
                <span className="text-[15px] font-bold text-white">Generatsiya qilinmoqda</span>
                <Zap className="h-4 w-4 text-fuchsia-400" style={{ animation: "bounce 1s infinite 0.3s" }} />
              </div>
              <p className="text-sm text-violet-300/80 animate-pulse min-h-5">{GEN_STEPS[genStep]}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[220px] space-y-1.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${((genStep + 1) / GEN_STEPS.length) * 100}%`,
                    background: "linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)",
                  }} />
              </div>
              <p className="text-right text-[10px] text-white/30">
                {Math.round(((genStep + 1) / GEN_STEPS.length) * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {stage === "result" && resultImg && (
          <div className="flex flex-col items-center gap-4 w-full px-6">
            <div className="relative w-full max-w-[260px]">
              <img src={resultImg} alt="Result"
                className="w-full rounded-3xl object-cover shadow-2xl border border-violet-500/20"
                style={{ maxHeight: 360 }} />
              {selectedProduct?.images?.[0] && (
                <div className="absolute bottom-3 right-3 h-16 w-16 overflow-hidden rounded-2xl border-2 border-violet-400 shadow-xl">
                  <img src={selectedProduct.images[0]} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-bold text-white">OnexAI natija</span>
              </div>
            </div>

            {selectedProduct && (
              <div className="flex w-full max-w-[260px] items-center gap-3 rounded-2xl border border-violet-500/15 bg-white/5 backdrop-blur-sm px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/40">Tanlangan kiyim</p>
                  <p className="text-sm font-semibold text-white line-clamp-1">{selectedProduct.name}</p>
                  <p className="text-sm font-bold text-violet-300">{format(Number(selectedProduct.price))}</p>
                </div>
              </div>
            )}

            <button onClick={reset}
              className="rounded-full border border-white/10 bg-white/5 px-7 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 transition">
              Qayta urinish
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTION ── */}
      {stage !== "generating" && stage !== "result" && !isEmpty && (
        <div className="relative z-10 px-6 pb-10 pt-4">
          <button onClick={handleGenerate}
            disabled={!userPhoto || !selectedProduct}
            className={`w-full rounded-2xl py-4 text-[15px] font-bold transition-all duration-300 ${
              userPhoto && selectedProduct
                ? "text-white shadow-xl shadow-violet-500/30 active:scale-[0.98]"
                : "bg-white/6 text-white/30 border border-white/8 cursor-not-allowed"
            }`}
            style={userPhoto && selectedProduct ? {
              background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 40%, #a855f7 70%, #ec4899 100%)",
            } : {}}>
            {!userPhoto
              ? "📷  Avval rasmingizni yuklang"
              : !selectedProduct
              ? "👆  Kiyim tanlang (kartochkani bosing)"
              : "✨  Kiyimni kiydirish"}
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.6;  transform: scale(1.4); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.5); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-6px) rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
