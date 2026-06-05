import { cn } from "@/lib/utils";

/* Base skeleton block */
export function Sk({ className = "" }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* ── Product card skeleton (matches ProductCard layout) ── */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <Sk className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Sk className="h-3.5 w-3/4" />
        <Sk className="h-3 w-1/2" />
        <Sk className="h-4 w-2/3 mt-1" />
        <Sk className="h-8 w-full rounded-xl mt-2" />
      </div>
    </div>
  );
}

/* ── Hero banner skeleton ── */
export function HeroBannerSkeleton() {
  return <Sk className="w-full rounded-2xl" style={{ height: 130 }} />;
}

/* ── Category icons skeleton ── */
export function CategoryIconsSkeleton() {
  return (
    <div className="flex gap-3 px-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px]">
          <Sk className="h-[52px] w-[52px] rounded-full" />
          <Sk className="h-2.5 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Sale card skeleton (horizontal) ── */
export function SaleCardSkeleton() {
  return (
    <div className="w-[140px] shrink-0 overflow-hidden rounded-xl bg-white/10">
      <Sk className="aspect-square w-full rounded-none" style={{ background: "rgba(255,255,255,0.12)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
      <div className="p-2.5 space-y-1.5">
        <Sk className="h-3.5 w-3/4" style={{ background: "rgba(255,255,255,0.12)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
        <Sk className="h-3 w-1/2" style={{ background: "rgba(255,255,255,0.08)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
        <Sk className="h-7 w-full rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.12)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

/* ── Cart item skeleton ── */
export function CartItemSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <Sk className="h-[80px] w-[80px] shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2 pt-1">
        <Sk className="h-5 w-3/4" />
        <Sk className="h-3.5 w-1/2" />
        <Sk className="h-3 w-1/3" />
        <Sk className="h-9 w-28 rounded-2xl mt-2" />
      </div>
    </div>
  );
}

/* ── Order card skeleton ── */
export function OrderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Sk className="h-6 w-24 rounded-full" />
        <Sk className="h-4 w-16" />
      </div>
      <Sk className="h-5 w-48" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-16 w-16 rounded-xl" />)}
      </div>
      <Sk className="h-4 w-32" />
      <Sk className="h-10 w-full rounded-xl" />
    </div>
  );
}

/* ── Product detail skeleton (full page) ── */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Image */}
      <Sk className="w-full rounded-none" style={{ height: 360 }} />
      <div className="px-4 py-4 space-y-3 bg-white">
        <Sk className="h-6 w-3/4" />
        <Sk className="h-4 w-1/2" />
        <Sk className="h-8 w-40" />
        <div className="flex gap-2 pt-1">
          <Sk className="h-4 w-20 rounded-full" />
          <Sk className="h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="mx-4 mt-3 rounded-2xl bg-white p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-3.5" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
      <div className="mx-4 mt-3 rounded-2xl bg-white p-4 space-y-2">
        <Sk className="h-5 w-32 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-3.5" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Wishlist page skeleton ── */
export function WishlistSkeleton() {
  return (
    <div className="px-4 pt-4">
      <Sk className="h-4 w-48 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
