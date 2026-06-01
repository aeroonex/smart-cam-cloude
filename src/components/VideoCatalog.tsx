import { useEffect, useRef, useState } from "react";
import { Heart, Play, ShoppingCart, Share2, X } from "lucide-react";
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
    if (active) {
      void v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
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
        <img
          src={src}
          alt={product.name}
          className="h-full w-full object-contain"
          onClick={() => navigate(`/product/${product.id}`)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl bg-neutral-900">📷</div>
      )}

      {isVid && !playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-4 items-center">
        <button onClick={onToggleWishlist} className="flex flex-col items-center gap-1">
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
        <button onClick={() => navigate(`/product/${product.id}`)} className="text-left">
          <p className="font-bold text-white text-base leading-snug line-clamp-2">{product.name}</p>
          <p className="text-orange-300 font-extrabold text-lg">{formatPrice(Number(product.price))}</p>
        </button>
        {product.category && (
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">
            {product.category}
          </span>
        )}
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
  const [dragOffset, setDragOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

  const videoProducts = products.filter(
    (p) => (p.videos?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0
  );
  if (videoProducts.length === 0) return null;

  const SNAP_THRESHOLD = 55;

  function snapTo(newIdx: number) {
    setSnapping(true);
    setDragOffset(0);
    setIdx(newIdx);
    setTimeout(() => setSnapping(false), 320);
  }

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
    setSnapping(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    const dx = Math.abs(e.touches[0].clientX - startX.current);
    // Faqat vertikal swipe
    if (dx > Math.abs(dy) * 1.3) return;
    const atTop = idx === 0 && dy > 0;
    const atBottom = idx === videoProducts.length - 1 && dy < 0;
    setDragOffset(atTop || atBottom ? dy * 0.2 : dy);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dy = startY.current - e.changedTouches[0].clientY;
    const dx = Math.abs(startX.current - e.changedTouches[0].clientX);

    // Horizontal swipe right = close (Instagram kabi)
    if (dx > 100 && Math.abs(dy) < 80) {
      onClose();
      return;
    }

    if (dy > SNAP_THRESHOLD && idx < videoProducts.length - 1) {
      snapTo(idx + 1);
    } else if (dy < -SNAP_THRESHOLD && idx > 0) {
      snapTo(idx - 1);
    } else {
      setSnapping(true);
      setDragOffset(0);
      setTimeout(() => setSnapping(false), 280);
    }
  }

  function onWheel(e: React.WheelEvent) {
    if (snapping) return;
    if (e.deltaY > 30 && idx < videoProducts.length - 1) snapTo(idx + 1);
    if (e.deltaY < -30 && idx > 0) snapTo(idx - 1);
  }

  // prev, current, next slidesni render qilish
  const visibleSlides = [
    { slideIdx: idx - 1, offset: -screenH },
    { slideIdx: idx,     offset: 0 },
    { slideIdx: idx + 1, offset: screenH },
  ].filter(({ slideIdx }) => slideIdx >= 0 && slideIdx < videoProducts.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden touch-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/40 px-3 py-1 text-xs text-white pointer-events-none">
        {idx + 1} / {videoProducts.length}
      </div>

      {/* Slides container — real-time drag + snap */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${-dragOffset}px)`,
          transition: snapping
            ? "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "none",
          willChange: "transform",
        }}
      >
        {visibleSlides.map(({ slideIdx, offset }) => (
          <div
            key={slideIdx}
            className="absolute inset-0"
            style={{ transform: `translateY(${offset}px)` }}
          >
            <VideoSlide
              product={videoProducts[slideIdx]}
              active={slideIdx === idx}
              onAddToCart={onAddToCart}
              inWishlist={inWishlist(videoProducts[slideIdx].id)}
              onToggleWishlist={() => onToggleWishlist(videoProducts[slideIdx].id)}
            />
          </div>
        ))}
      </div>

      {/* Progress dots (o'ng tomon) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-none">
        {videoProducts.slice(0, 10).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === idx ? "h-5 w-1.5 bg-white" : "h-1.5 w-1.5 bg-white/35"
            }`}
          />
        ))}
        {videoProducts.length > 10 && (
          <span className="text-[10px] text-white/50 text-center">···</span>
        )}
      </div>
    </div>
  );
}
