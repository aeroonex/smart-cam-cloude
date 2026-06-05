import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type PromoSectionRow = Database["public"]["Tables"]["promo_sections"]["Row"];

type Props = {
  section: PromoSectionRow;
  products: Product[];
  onAddToCart: (p: Product) => void;
  inWishlist: (id: string) => boolean;
  onToggleWishlist: (id: string) => void;
};

function useCountdown(endTime: string | null) {
  const calc = () => {
    if (!endTime) return null;
    const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, done: diff === 0 };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return time;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function hashNum(id: string, salt: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

/* Digit flip tile */
function DigitTile({ value, color }: { value: string; color: string }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => { setPrev(value); setFlipping(false); }, 200);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <span
      className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white/90 text-sm font-extrabold tabular-nums shadow-sm select-none"
      style={{
        color,
        transform: flipping ? "scaleY(0.1)" : "scaleY(1)",
        transition: "transform 0.15s ease-in-out",
        transformOrigin: "center",
      }}
    >
      {prev}
    </span>
  );
}

/* Fire icon with glow pulse */
function FireIcon() {
  return (
    <span
      className="inline-flex items-center justify-center text-[18px] leading-none select-none"
      style={{
        animation: "fire-pulse 1.2s ease-in-out infinite alternate",
        display: "inline-block",
      }}
    >
      🔥
    </span>
  );
}

export function PromoSection({ section, products, onAddToCart }: Props) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const countdown = useCountdown(section.end_time);

  const bgColor = section.bg_color || "#4F46E5";
  const textColor = section.text_color || "#ffffff";

  /* ── Auto-scroll ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || products.length === 0) return;

    const speed = 0.6; // px per frame

    const tick = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += speed;
        // Seamless loop: items are doubled, reset at halfway
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [products.length]);

  if (!products.length) return null;

  /* Duplicate for infinite loop */
  const items = [...products, ...products];

  return (
    <>
      {/* Inject fire keyframe once */}
      <style>{`
        @keyframes fire-pulse {
          0%   { transform: scale(1)   rotate(-3deg); filter: brightness(1); }
          100% { transform: scale(1.25) rotate(3deg); filter: brightness(1.3) drop-shadow(0 0 6px #fb923c); }
        }
      `}</style>

      <div className="mt-3 overflow-hidden rounded-2xl mx-3" style={{ background: bgColor }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-lg font-bold" style={{ color: textColor }}>
            {section.title}
          </h2>

          {countdown && !countdown.done && (
            <div className="flex items-center gap-2">
              {/* Timer digits */}
              <div className="flex items-center gap-0.5">
                {[
                  { val: pad(countdown.h), key: "h" },
                  { val: pad(countdown.m), key: "m" },
                  { val: pad(countdown.s), key: "s" },
                ].map(({ val, key }, i) => (
                  <span key={key} className="flex items-center">
                    <DigitTile value={val} color={bgColor} />
                    {i < 2 && (
                      <span className="mx-0.5 text-base font-extrabold leading-none" style={{ color: textColor }}>:</span>
                    )}
                  </span>
                ))}
              </div>
              {/* Animated fire */}
              <FireIcon />
            </div>
          )}
        </div>

        {/* Scrolling cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-4"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          onScroll={() => { /* allow manual scroll */ }}
        >
          {items.map((product, idx) => {
            const img = product.images?.[0] ?? null;
            const discountPct = (product as unknown as { discount_percent?: number }).discount_percent;
            const origPrice = (product as unknown as { original_price?: number }).original_price;
            const rating = (4.5 + (hashNum(product.id, 3) % 5) / 10).toFixed(1);
            const sold = product.sold_count > 0 ? product.sold_count : (hashNum(product.id, 13) % 2000) + 50;

            return (
              <div
                key={`${product.id}-${idx}`}
                className="relative flex w-44 shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-transform active:scale-[0.97]"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {/* Image */}
                <div className="relative bg-neutral-50" style={{ height: 144 }}>
                  {img ? (
                    <img src={img} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingCart className="h-10 w-10 text-neutral-200" />
                    </div>
                  )}
                  {discountPct && (
                    <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                      -{discountPct}%
                    </span>
                  )}
                  {product.stock_count === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">Tugadi</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                  {origPrice && origPrice > Number(product.price) && (
                    <p className="text-[11px] text-neutral-400 line-through">{formatPrice(origPrice)}</p>
                  )}
                  <p className="text-sm font-extrabold text-neutral-900">{formatPrice(Number(product.price))}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[11px] text-neutral-500">{rating} · {sold.toLocaleString()}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-neutral-700 leading-snug mt-0.5">{product.name}</p>
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCart(product); }}
                    disabled={product.stock_count === 0}
                    className="mt-auto w-full rounded-lg py-1.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                    style={{ background: bgColor }}
                  >
                    {product.stock_count === 0 ? "Tugadi" : "Savatga"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
