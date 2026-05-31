import { useEffect, useState, useRef } from "react";
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

export function PromoSection({ section, products, onAddToCart, inWishlist, onToggleWishlist }: Props) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown(section.end_time);

  const bgColor = section.bg_color || "#4F46E5";
  const textColor = section.text_color || "#ffffff";

  if (!products.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl mx-3" style={{ background: bgColor }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold" style={{ color: textColor }}>
          {section.title}
        </h2>
        {countdown && !countdown.done && (
          <div className="flex items-center gap-1">
            {[pad(countdown.h), pad(countdown.m), pad(countdown.s)].map((v, i) => (
              <span key={i} className="flex items-center">
                <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-sm font-bold tabular-nums" style={{ color: bgColor }}>
                  {v}
                </span>
                {i < 2 && <span className="mx-0.5 font-bold text-white/80">:</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((product) => {
          const img = product.images?.[0] ?? null;
          const discount = (() => { const v = hashNum(product.id, 7) % 60; return v < 10 ? null : v; })();
          const originalPrice = discount ? Math.round(Number(product.price) / (1 - discount / 100)) : null;
          const rating = (4.5 + (hashNum(product.id, 3) % 5) / 10).toFixed(1);
          const sold = product.sold_count > 0 ? product.sold_count : (hashNum(product.id, 13) % 2000) + 50;

          return (
            <div
              key={product.id}
              className="relative flex w-44 shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-sm"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              {/* Image */}
              <div className="relative bg-neutral-50" style={{ height: 144 }}>
                {img ? (
                  <img src={img} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-neutral-200" />
                  </div>
                )}
                {discount && (
                  <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                {discount && originalPrice && (
                  <p className="text-[11px] text-neutral-400 line-through">{formatPrice(originalPrice)}</p>
                )}
                <p className="text-sm font-extrabold text-neutral-900">{formatPrice(Number(product.price))}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] text-neutral-500">{rating} · {sold.toLocaleString()}</span>
                </div>
                <p className="line-clamp-2 text-xs text-neutral-700 leading-snug">{product.name}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                  className="mt-auto w-full rounded-lg py-1.5 text-xs font-semibold text-white transition"
                  style={{ background: bgColor }}
                >
                  Savatga
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
