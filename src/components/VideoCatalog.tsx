import { useEffect, useRef, useState } from "react";
import { Heart, Pause, Play, ShoppingCart, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  products: Product[];
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  inWishlist: (id: string) => boolean;
  onToggleWishlist: (id: string) => void;
};

function VideoSlide({
  product,
  active,
  onAddToCart,
  inWishlist,
  onToggleWishlist,
}: {
  product: Product;
  active: boolean;
  onAddToCart: (p: Product) => void;
  inWishlist: boolean;
  onToggleWishlist: () => void;
}) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const media = [...(product.videos ?? []), ...(product.images ?? [])];
  const src = media[0] ?? null;
  const isVid = src ? /\.(mp4|webm|mov)(\?.*)?$/i.test(src) : false;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) { void v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
  }, [active]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { void v.play(); setPlaying(true); }
  }

  function shareToTelegram() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + "/product/" + product.id)}&text=${encodeURIComponent(product.name + " — " + formatPrice(Number(product.price)))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black">
      {/* Media */}
      {isVid ? (
        <video
          ref={videoRef}
          src={src!}
          loop
          playsInline
          muted={false}
          className="h-full w-full object-cover"
          onClick={togglePlay}
        />
      ) : src ? (
        <img src={src} alt={product.name} className="h-full w-full object-contain" onClick={() => navigate(`/product/${product.id}`)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl bg-neutral-900">📷</div>
      )}

      {/* Play/pause overlay for video */}
      {isVid && !playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-4 items-center">
        <button
          onClick={onToggleWishlist}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Heart className={`h-6 w-6 ${inWishlist ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-[11px] text-white font-medium">Sevimli</span>
        </button>

        <button
          onClick={() => { onAddToCart(product); toast.success("Savatga qo'shildi!"); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EE7526]">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <span className="text-[11px] text-white font-medium">Savat</span>
        </button>

        <button onClick={shareToTelegram} className="flex flex-col items-center gap-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-[11px] text-white font-medium">Ulash</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16 space-y-1">
        <button
          onClick={() => navigate(`/product/${product.id}`)}
          className="text-left"
        >
          <p className="font-bold text-white text-base leading-snug line-clamp-2">{product.name}</p>
          <p className="text-orange-300 font-extrabold text-lg">{formatPrice(Number(product.price))}</p>
        </button>
        {product.category && (
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">
            {product.category}
          </span>
        )}
        {/* Stock badge */}
        {product.stock_count === 0 ? (
          <span className="inline-block rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">Tugadi</span>
        ) : product.stock_count <= 5 && product.stock_count > 0 ? (
          <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            Faqat {product.stock_count} ta qoldi!
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function VideoCatalog({ products, onClose, onAddToCart, inWishlist, onToggleWishlist }: Props) {
  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const videoProducts = products.filter((p) => (p.videos?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0);
  if (videoProducts.length === 0) return null;

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dy = startY.current - e.changedTouches[0].clientY;
    if (dy > 50 && idx < videoProducts.length - 1) setIdx((i) => i + 1);
    if (dy < -50 && idx > 0) setIdx((i) => i - 1);
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY > 30 && idx < videoProducts.length - 1) setIdx((i) => i + 1);
    if (e.deltaY < -30 && idx > 0) setIdx((i) => i - 1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-safe-top z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm mt-4"
        style={{ top: 16 }}
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
        {idx + 1} / {videoProducts.length}
      </div>

      {/* Slides */}
      <div ref={containerRef} className="h-full w-full">
        <VideoSlide
          product={videoProducts[idx]}
          active={true}
          onAddToCart={onAddToCart}
          inWishlist={inWishlist(videoProducts[idx].id)}
          onToggleWishlist={() => onToggleWishlist(videoProducts[idx].id)}
        />
      </div>

      {/* Swipe hint dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {videoProducts.slice(0, 8).map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
        {videoProducts.length > 8 && <span className="text-[10px] text-white/60 text-center">...</span>}
      </div>
    </div>
  );
}
