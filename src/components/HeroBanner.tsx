import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { HeroBannerSkeleton } from "@/components/Skeleton";

type Banner = Database["public"]["Tables"]["banners"]["Row"];

/* Bazada banner bo'lmasa ko'rsatiladigan zaxira bannerlar */
const fallbackBanners = [
  {
    id: "fallback-1",
    image_url: "",
    link_url: null,
    title: "BEPUL YETKAZIB BERAMIZ",
    subtitle: "Chegirmali mahsulotlarni tanlang!",
    badge: "KATTA CHEGIRMA",
    bg: "from-[#1d4f8a] to-[#0f2d5c]",
    accent: "90%gacha",
    accentText: "text-[#1d4f8a]",
  },
  {
    id: "fallback-2",
    image_url: "",
    link_url: null,
    title: "BAHOR SEZONI",
    subtitle: "Eng yangi tendensiyalar sizni kutmoqda",
    badge: "YANGI KOLLEKSIYA",
    bg: "from-[#164078] to-[#1d4f8a]",
    accent: "−50%",
    accentText: "text-[#1d4f8a]",
  },
  {
    id: "fallback-3",
    image_url: "",
    link_url: null,
    title: "ELEKTRONIKA AKSIYASI",
    subtitle: "Gadjet va aksessuarlarga maxsus narxlar",
    badge: "TOP TAKLIF",
    bg: "from-[#0d2744] to-[#2860a8]",
    accent: "−40%",
    accentText: "text-[#1d4f8a]",
  },
];

/* Outer: only fetches data, shows skeleton while loading */
export function HeroBanner() {
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setBanners(data ?? []));
  }, []);

  if (banners === null) return <HeroBannerSkeleton />;
  return <HeroBannerInner banners={banners} />;
}

/* Inner: always mounts with same hook count */
function HeroBannerInner({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);

  const usingDb = banners.length > 0;
  const slides = usingDb ? banners : fallbackBanners;
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % count), 4000);
    return () => clearInterval(t);
  }, [count]);

  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  const slide = slides[current] ?? slides[0];
  const hasImage = usingDb && !!(slide as Banner).image_url;
  const linkUrl = (slide as Banner).link_url ?? null;

  const goToLink = () => {
    if (linkUrl) window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-500 ${
        hasImage ? "bg-neutral-900" : `bg-gradient-to-r ${(slide as typeof fallbackBanners[number]).bg}`
      } ${linkUrl ? "cursor-pointer" : ""}`}
      style={{ height: 130 }}
      onClick={goToLink}
    >
      {/* Rasm (admin yuklagan) */}
      {hasImage && (
        <img
          src={(slide as Banner).image_url}
          alt={(slide as Banner).title ?? "Banner"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Matn overlay — agar title bo'lsa */}
      {(slide.title || slide.badge) && (
        <div className={`relative mx-auto flex h-full max-w-7xl items-center px-6 sm:px-8 ${hasImage ? "bg-gradient-to-r from-black/50 to-transparent" : ""}`}>
          <div className="space-y-2 text-white">
            {slide.badge && (
              <span className="inline-block rounded bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                {slide.badge}
              </span>
            )}
            {slide.title && (
              <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">{slide.title}</h2>
            )}
            {slide.subtitle && <p className="text-sm text-white/80">{slide.subtitle}</p>}
            {!usingDb && (
              <div className={`mt-3 inline-block rounded-xl bg-white px-5 py-2 text-xl font-extrabold shadow-md ${(slide as typeof fallbackBanners[number]).accentText}`}>
                {(slide as typeof fallbackBanners[number]).accent}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bezak doiralar (faqat rasm yo'q bo'lsa) */}
      {!hasImage && (
        <>
          <div className="absolute -right-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-white/10" />
          <div className="absolute -right-4 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10" />
        </>
      )}

      {/* Strelkalar */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Nuqtalar */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
