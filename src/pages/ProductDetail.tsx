import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Gift,
  Heart, Loader2, MessageSquare, Package, Pause, Play,
  RotateCcw, Send, Share2, ShieldCheck, ShoppingCart,
  Star, Truck, ZoomIn,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HammaBopLogo } from "@/components/HammaBopLogo";
import { NasiyaCalculator } from "@/components/NasiyaCalculator";
import { useSessionContext } from "@/components/session-context-provider";
import { useCart } from "@/hooks/useCart";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Review = {
  id: string; product_id: string; user_id: string;
  rating: number; comment: string | null; created_at: string;
  users?: { full_name: string; avatar_url?: string | null };
};

function isVideo(url: string) { return /\.(mp4|webm|mov|avi|ogv)(\?.*)?$/i.test(url); }
function pct(reviews: Review[], n: number) {
  if (!reviews.length) return 0;
  return Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100);
}

const COLORS_PALETTE: Record<string, string> = {
  "Qizil": "#ef4444", "Ko'k": "#3b82f6", "Yashil": "#22c55e",
  "Sariq": "#eab308", "Oq": "#f5f5f5", "Qora": "#1f2937",
  "Kulrang": "#9ca3af", "Jigarrang": "#a16207", "Binafsha": "#9333ea",
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const { addToCart } = useCart();
  const { format: formatPrice } = useCurrency();
  const { track } = useRecentlyViewed(user);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsSupported, setReviewsSupported] = useState(true);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [myPendingReview, setMyPendingReview] = useState<Review | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [slide, setSlide] = useState(0);
  const [wished, setWished] = useState(false);
  const [qty, setQty] = useState(1);
  const [lightbox, setLightbox] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadProduct();
    void loadReviews();
    void track(id);
    if (user) void checkCanReview();
  }, [id, user]);

  async function loadProduct() {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("id", id!).single();
    setProduct(data as Product | null);
    if ((data as Product)?.category) {
      const { data: rel } = await supabase.from("products").select("*")
        .eq("category", (data as Product).category!)
        .eq("status", "active").neq("id", id!).limit(6);
      setRelated((rel as Product[]) ?? []);
    }
    setLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase.from("product_reviews")
        .select("*, users(full_name, avatar_url)")
        .eq("product_id", id!).eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) { setReviewsSupported(false); setReviews([]); }
      else setReviews((data as Review[]) ?? []);
      if (user) {
        const { data: mine } = await supabase.from("product_reviews")
          .select("*, users(full_name, avatar_url)")
          .eq("product_id", id!).eq("user_id", user.id).single();
        const m = mine as (Review & { is_approved?: boolean }) | null;
        if (m?.is_approved) setMyReview(m);
        else if (m) setMyPendingReview(m);
      }
    } catch { setReviewsSupported(false); }
    setReviewsLoading(false);
  }

  async function checkCanReview() {
    if (!user || !id) return;
    const { data } = await supabase.from("orders").select("id, items")
      .eq("user_id", user.id).eq("status", "mijoz_qabul_qildi");
    const bought = (data ?? []).some(order =>
      (order.items as { product_id?: string }[]).some(i => i.product_id === id)
    );
    setCanReview(bought);
  }

  async function submitReview() {
    if (!user) { navigate("/login"); return; }
    if (!commentInput.trim()) { toast.error("Izoh yozing."); return; }
    setSubmitting(true);
    try {
      await supabase.from("product_reviews").insert({
        product_id: id!, user_id: user.id,
        rating: ratingInput, comment: commentInput.trim(),
        status: "pending", is_approved: false,
      });
      setCommentInput("");
      setMyPendingReview({ id: "pending", product_id: id!, user_id: user.id, rating: ratingInput, comment: commentInput.trim(), created_at: new Date().toISOString() });
      toast.success("Izohingiz moderatsiyaga yuborildi.");
    } catch { toast.error("Yuborilmadi."); }
    setSubmitting(false);
  }

  function handleAddToCart() {
    if (!product) return;
    if ((product.sizes ?? []).length > 0 && !selectedSize) { toast.error("O'lchamni tanlang"); return; }
    if ((product.colors ?? []).length > 0 && !selectedColor) { toast.error("Rangni tanlang"); return; }
    for (let i = 0; i < qty; i++) addToCart(product);
    toast.success(`${product.name} savatga qo'shildi!`);
  }

  function shareProduct() {
    if (navigator.share) {
      void navigator.share({ title: product?.name, url: window.location.href });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      toast.success("Havola nusxalandi!");
    }
  }

  const allMedia: string[] = [...(product?.images ?? []), ...(product?.videos ?? [])];
  const current = allMedia[slide] ?? null;
  const currentIsVideo = current ? isVideo(current) : false;

  function goSlide(dir: number) {
    if (videoRef.current) videoRef.current.pause();
    setVideoPlaying(false);
    setSlide(s => (s + dir + allMedia.length) % allMedia.length);
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
      <Loader2 className="h-10 w-10 animate-spin text-[#EE7526]" />
    </div>
  );

  if (!product) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg font-semibold text-neutral-600">Mahsulot topilmadi</p>
      <Button asChild className="rounded-full bg-[#EE7526] text-white"><Link to="/">Bosh sahifaga</Link></Button>
    </div>
  );

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const specs = product.specifications as Record<string, string> | null;
  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];
  const inStock = product.stock_count > 0;
  const lowStock = product.stock_count > 0 && product.stock_count <= 5;
  const discountPct = (product as unknown as { discount_percent?: number }).discount_percent;
  const origPrice = (product as unknown as { original_price?: number }).original_price;
  const warranty = (product as unknown as { warranty?: string }).warranty;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* ══════════ HEADER ══════════ */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#EE7526] shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-white">
            <HammaBopLogo size={28} dark />
            <span className="hidden font-extrabold text-lg tracking-tight sm:block">
              Hamma<span className="text-orange-200">Bop</span>
            </span>
          </Link>
          <button onClick={() => navigate(-1)}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/30">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </button>
          <div className="flex-1" />
          <button onClick={() => setWished(w => !w)}
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/30">
            <Heart className={`h-4 w-4 ${wished ? "fill-white" : ""}`} />
            <span className="hidden sm:inline">Sevimli</span>
          </button>
          <button onClick={shareProduct}
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/30">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Ulashish</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500">
          <Link to="/" className="transition hover:text-[#EE7526]">HammaBop</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)}
                className="transition hover:text-[#EE7526]">{product.category}</button>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 font-medium text-neutral-700">{product.name}</span>
        </nav>

        {/* ── Main card ── */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[420px_1fr_300px]">

            {/* ── GALLERY ── */}
            <div className="border-b border-neutral-100 p-4 lg:border-b-0 lg:border-r">
              {/* Thumbnails row (mobile top, desktop side) */}
              <div className="flex gap-3">
                {allMedia.length > 1 && (
                  <div className="hidden flex-col gap-2 sm:flex" style={{ width: 60 }}>
                    {allMedia.map((url, i) => (
                      <button key={i}
                        onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                          slide === i ? "border-[#EE7526] shadow-md shadow-orange-100" : "border-neutral-100 hover:border-orange-200"
                        }`}>
                        {isVideo(url) ? (
                          <div className="flex h-full items-center justify-center bg-neutral-50">
                            <Play className="h-4 w-4 text-[#EE7526]" />
                          </div>
                        ) : (
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <div className="flex-1">
                  <div
                    className="group relative overflow-hidden rounded-2xl bg-neutral-50"
                    style={{ aspectRatio: "1 / 1" }}
                    onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={e => {
                      if (touchStartX.current === null || allMedia.length <= 1) return;
                      const diff = touchStartX.current - e.changedTouches[0].clientX;
                      if (Math.abs(diff) > 40) goSlide(diff > 0 ? 1 : -1);
                      touchStartX.current = null;
                    }}
                  >
                    {current ? (
                      currentIsVideo ? (
                        <>
                          <video ref={videoRef} src={current} className="h-full w-full object-cover" loop playsInline
                            onClick={() => { if (videoRef.current) { if (videoPlaying) videoRef.current.pause(); else void videoRef.current.play(); setVideoPlaying(!videoPlaying); } }} />
                          {!videoPlaying && (
                            <button className="absolute inset-0 flex items-center justify-center"
                              onClick={() => { if (videoRef.current) { void videoRef.current.play(); setVideoPlaying(true); } }}>
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                                <Play className="h-7 w-7 fill-white" />
                              </div>
                            </button>
                          )}
                          {videoPlaying && (
                            <button className="absolute right-3 bottom-3 rounded-full bg-black/50 p-2 text-white"
                              onClick={() => { videoRef.current?.pause(); setVideoPlaying(false); }}>
                              <Pause className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <img src={current} alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                            onClick={() => setLightbox(true)} />
                          <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 opacity-0 shadow-md transition group-hover:opacity-100 cursor-zoom-in"
                            onClick={() => setLightbox(true)}>
                            <ZoomIn className="h-4 w-4 text-neutral-600" />
                          </div>
                        </>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingCart className="h-24 w-24 text-orange-100" />
                      </div>
                    )}

                    {/* Badges */}
                    {discountPct && (
                      <div className="absolute left-3 top-3 rounded-xl bg-red-500 px-3 py-1 text-sm font-bold text-white shadow">
                        -{discountPct}%
                      </div>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <span className="rounded-2xl bg-white px-5 py-2.5 text-base font-bold text-red-500 shadow-xl">Tugadi</span>
                      </div>
                    )}

                    {/* Nav arrows */}
                    {allMedia.length > 1 && (
                      <>
                        <button onClick={() => goSlide(-1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white hover:shadow-lg">
                          <ChevronLeft className="h-5 w-5 text-neutral-700" />
                        </button>
                        <button onClick={() => goSlide(1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white hover:shadow-lg">
                          <ChevronRight className="h-5 w-5 text-neutral-700" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Dots */}
                  {allMedia.length > 1 && (
                    <div className="mt-3 flex justify-center gap-1.5">
                      {allMedia.map((url, i) => (
                        <button key={i}
                          onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === slide ? "w-6 bg-[#EE7526]" : isVideo(url) ? "w-2 bg-blue-300" : "w-2 bg-neutral-300"
                          }`} />
                      ))}
                    </div>
                  )}

                  {/* Mobile thumbnails */}
                  {allMedia.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto sm:hidden">
                      {allMedia.map((url, i) => (
                        <button key={i}
                          onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
                          className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                            slide === i ? "border-[#EE7526]" : "border-neutral-200"
                          }`}>
                          {isVideo(url) ? (
                            <div className="flex h-full items-center justify-center bg-neutral-50"><Play className="h-3 w-3 text-[#EE7526]" /></div>
                          ) : (
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Trust badges under image */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                {[
                  { icon: ShieldCheck, label: "Xavfsiz to'lov", color: "text-emerald-600" },
                  { icon: RotateCcw, label: "15 kun qaytarish", color: "text-blue-600" },
                  { icon: BadgeCheck, label: "Kafolatli", color: "text-purple-600" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-neutral-50 py-2.5">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-medium text-neutral-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PRODUCT INFO ── */}
            <div className="space-y-3 p-4 lg:p-5">
              {/* Warranty badge — Uzum style */}
              {warranty && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Kafolat {warranty}
                </div>
              )}

              {/* Category + title */}
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)}
                    className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-[#EE7526] hover:bg-orange-100">
                    {product.category}
                  </button>
                )}
                {discountPct && (
                  <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">-{discountPct}%</span>
                )}
              </div>
              <h1 className="text-xl font-extrabold leading-tight text-neutral-900 sm:text-2xl">{product.name}</h1>

              {/* Rating + meta */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />
                      ))}
                    </div>
                    <span className="font-semibold text-amber-500">{avgRating.toFixed(1)}</span>
                    <a href="#reviews" className="text-neutral-400 hover:text-[#EE7526]">({reviews.length})</a>
                  </div>
                )}
                <span className="text-neutral-400">{product.sold_count} ta sotildi</span>
              </div>

              {/* Price */}
              <div className="rounded-xl bg-orange-50 px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-neutral-900">
                    {formatPrice(Number(product.price))}
                  </p>
                  {origPrice && origPrice > Number(product.price) && (
                    <p className="text-sm text-neutral-400 line-through">{formatPrice(origPrice)}</p>
                  )}
                </div>
                {discountPct && origPrice && (
                  <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                    {formatPrice(origPrice - Number(product.price))} tejaysiz
                  </p>
                )}
                {product.cashback_amount > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#EE7526]">
                    <Gift className="h-3 w-3" /> +{product.cashback_amount.toLocaleString()} so'm cashback
                  </div>
                )}
              </div>

              {/* Stock */}
              {!inStock ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Omborda yo'q
                </div>
              ) : lowStock ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Faqat <b>{product.stock_count} ta</b> qoldi
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Omborda mavjud
                </div>
              )}

              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-neutral-600">O'lcham:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map(s => (
                      <button key={s} onClick={() => setSelectedSize(s)}
                        className={`rounded-lg border-2 px-3 py-1 text-sm font-semibold transition ${
                          selectedSize === s ? "border-[#EE7526] bg-[#EE7526] text-white" : "border-neutral-200 hover:border-orange-200"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {colors.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-neutral-600">
                    Rang{selectedColor ? `: ${selectedColor}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)} title={c}
                        className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                          selectedColor === c ? "border-[#EE7526] scale-110" : "border-neutral-200 hover:scale-105"
                        }`}
                        style={{ backgroundColor: COLORS_PALETTE[c] ?? c }}>
                        {selectedColor === c && (
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="mb-1 text-xs font-bold text-neutral-600">Tavsif</h3>
                  <p className="text-sm leading-relaxed text-neutral-600 whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {/* Specs */}
              {specs && Object.keys(specs).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold text-neutral-600">Texnik xususiyatlar</h3>
                  <div className="overflow-hidden rounded-xl border border-neutral-100">
                    {Object.entries(specs).map(([k, v], i) => (
                      <div key={k} className={`flex gap-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-neutral-50" : "bg-white"}`}>
                        <span className="w-32 shrink-0 text-neutral-500">{k}</span>
                        <span className="font-semibold text-neutral-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery */}
              <div className="flex gap-4 rounded-xl border border-neutral-100 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-semibold">
                    {product.delivery_free || product.delivery_fee === 0 ? "Bepul yetkazish" : formatPrice(product.delivery_fee)}
                  </span>
                  <span className="text-neutral-400">· 3–7 kun</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>15 kun qaytarish</span>
                </div>
              </div>

              {/* Nasiya */}
              <NasiyaCalculator price={Number(product.price)} />
            </div>

            {/* ── BUY BOX ── */}
            <div className="border-t border-neutral-100 lg:border-l lg:border-t-0">
              <div className="sticky top-20 space-y-3 p-4">
                {/* Price repeat */}
                <div>
                  <p className="text-2xl font-extrabold text-neutral-900">{formatPrice(Number(product.price))}</p>
                  {origPrice && origPrice > Number(product.price) && (
                    <p className="text-xs text-neutral-400 line-through">{formatPrice(origPrice)}</p>
                  )}
                </div>

                {/* Qty */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">Soni:</span>
                  <div className="flex overflow-hidden rounded-xl border-2 border-neutral-200">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center text-lg font-bold text-neutral-600 hover:bg-neutral-50">−</button>
                    <span className="flex h-9 w-10 items-center justify-center text-sm font-bold">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(product.stock_count || 99, q + 1))}
                      className="flex h-9 w-9 items-center justify-center text-lg font-bold text-neutral-600 hover:bg-neutral-50">+</button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-2">
                  <Button disabled={!inStock} onClick={handleAddToCart}
                    className="h-12 w-full rounded-xl bg-[#EE7526] text-base font-bold text-white shadow-md hover:bg-[#d8661c] disabled:opacity-50">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {inStock ? "Savatga qo'shish" : "Tugadi"}
                  </Button>
                  <Button variant="outline" disabled={!inStock}
                    className="h-10 w-full rounded-xl border-2 border-[#EE7526] font-bold text-[#EE7526] hover:bg-orange-50 disabled:opacity-50"
                    onClick={() => { if (!user) { navigate("/login"); return; } handleAddToCart(); navigate("/"); }}>
                    Hozir sotib olish
                  </Button>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setWished(w => !w)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                      wished ? "border-red-200 bg-red-50 text-red-500" : "border-neutral-200 hover:bg-neutral-50"
                    }`}>
                    <Heart className={`h-4 w-4 ${wished ? "fill-red-500" : ""}`} />
                    {wished ? "Sevimlida" : "Sevimli"}
                  </button>
                  <button onClick={shareProduct}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 py-2.5 text-sm font-semibold transition hover:bg-neutral-50">
                    <Share2 className="h-4 w-4" /> Ulashish
                  </button>
                </div>

                {/* Seller info */}
                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BadgeCheck className="h-4 w-4 text-[#EE7526]" />
                    <p className="text-sm font-bold text-neutral-800">HammaBop Rasmiy</p>
                  </div>
                  <p className="text-xs text-neutral-500">✓ Tekshirilgan sotuvchi</p>
                  <p className="text-xs text-neutral-500">✓ 98.5% ijobiy baho</p>
                </div>

                <a href="https://t.me/HammaBopSupport" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-100 bg-blue-50 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  <MessageSquare className="h-4 w-4" />
                  Savol bormi? Bog'laning
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── REVIEWS ── */}
        <div id="reviews" className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-neutral-900">
              <MessageSquare className="h-5 w-5 text-[#EE7526]" />
              Izohlar va reytinglar
              {reviews.length > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-[#EE7526]">{reviews.length}</span>}
            </h2>
          </div>

          <div className="p-5 sm:p-8">
            {!reviewsSupported ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">Izohlar tizimi aktivlashtirilmoqda.</div>
            ) : (
              <>
                {reviews.length > 0 && (
                  <div className="mb-8 flex flex-col gap-6 sm:flex-row">
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 px-10 py-6">
                      <p className="text-6xl font-extrabold text-neutral-900">{avgRating.toFixed(1)}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />
                        ))}
                      </div>
                      <p className="text-sm text-neutral-500">{reviews.length} ta izoh</p>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {[5,4,3,2,1].map(n => (
                        <div key={n} className="flex items-center gap-3 text-sm">
                          <div className="flex w-8 items-center gap-0.5">
                            <span className="font-bold text-neutral-700">{n}</span>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          </div>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct(reviews, n)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs text-neutral-400">{pct(reviews, n)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review form */}
                {!user ? (
                  <div className="mb-6 rounded-2xl border-2 border-dashed border-orange-200 p-6 text-center">
                    <p className="mb-3 text-neutral-600">Izoh qoldirish uchun kiring</p>
                    <Button asChild className="rounded-full bg-[#EE7526] text-white px-6">
                      <Link to="/login">Kirish</Link>
                    </Button>
                  </div>
                ) : myPendingReview ? (
                  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="font-bold text-amber-800">⏳ Izohingiz moderatsiyada</p>
                    <p className="mt-1 text-sm text-amber-700">Admin tasdiqlashini kuting.</p>
                  </div>
                ) : myReview ? (
                  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="font-bold text-emerald-800">✓ Sizning izohingiz (tasdiqlangan)</p>
                    <div className="mt-2 flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />)}
                    </div>
                    {myReview.comment && <p className="mt-1 text-sm text-neutral-700">{myReview.comment}</p>}
                  </div>
                ) : canReview ? (
                  <div className="mb-6 rounded-2xl border-2 border-orange-100 bg-orange-50/30 p-5">
                    <h3 className="mb-3 font-bold text-neutral-800">Izoh qoldiring</h3>
                    <div className="mb-3 flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setRatingInput(s)}>
                          <Star className={`h-8 w-8 transition-all ${s <= ratingInput ? "fill-amber-400 text-amber-400 scale-110" : "text-neutral-300 hover:text-amber-300"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea value={commentInput} onChange={e => setCommentInput(e.target.value)}
                      placeholder="Mahsulot haqida fikringizni yozing..."
                      className="mb-3 min-h-24 rounded-xl border-orange-100 bg-white focus:border-[#EE7526]" rows={3} />
                    <Button onClick={() => void submitReview()} disabled={submitting}
                      className="rounded-full bg-[#EE7526] text-white px-6 hover:bg-[#d8661c]">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                      Yuborish
                    </Button>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <Package className="h-5 w-5 shrink-0 text-neutral-400" />
                    <p className="text-sm text-neutral-500">Izoh qoldirish uchun mahsulotni sotib olib, yetkazilishini kuting.</p>
                  </div>
                )}

                {/* Reviews list */}
                {reviewsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>
                ) : reviews.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <MessageSquare className="h-10 w-10 text-neutral-200" />
                    <p className="text-neutral-400">Hali izoh yo'q. Birinchi bo'lib yozing!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {reviews.map(review => (
                      <div key={review.id} className="flex gap-4 py-5">
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-orange-100">
                          <AvatarFallback className="bg-orange-100 font-bold text-[#EE7526]">
                            {getInitials(review.users?.full_name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-bold text-neutral-900">{review.users?.full_name ?? "Foydalanuvchi"}</p>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />)}
                            </div>
                            <span className="text-xs text-neutral-400">{new Date(review.created_at).toLocaleDateString("uz-UZ")}</span>
                          </div>
                          {review.comment && <p className="text-sm leading-relaxed text-neutral-600">{review.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RELATED PRODUCTS ── */}
        {related.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h2 className="text-lg font-extrabold text-neutral-900">O'xshash mahsulotlar</h2>
              {product.category && (
                <button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)}
                  className="text-sm font-semibold text-[#EE7526] transition hover:underline">
                  Barchasi →
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {related.map(p => {
                const pDiscount = (p as unknown as { discount_percent?: number }).discount_percent;
                const pOrig = (p as unknown as { original_price?: number }).original_price;
                const pInStock = p.stock_count > 0;
                return (
                  <Link key={p.id} to={`/product/${p.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:shadow-neutral-200">
                    <div className="relative overflow-hidden bg-neutral-50" style={{ paddingBottom: "100%" }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingCart className="h-10 w-10 text-orange-100" />
                        </div>
                      )}
                      {pDiscount && (
                        <div className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          -{pDiscount}%
                        </div>
                      )}
                      {!pInStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-red-500">Tugadi</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-neutral-700 flex-1">{p.name}</p>
                      <div className="mt-2">
                        <p className="font-extrabold text-[#EE7526]">{formatPrice(Number(p.price))}</p>
                        {pOrig && pOrig > Number(p.price) && (
                          <p className="text-[10px] text-neutral-400 line-through">{formatPrice(pOrig)}</p>
                        )}
                      </div>
                      {p.sold_count > 0 && (
                        <p className="mt-0.5 text-[10px] text-neutral-400">{p.sold_count} ta sotildi</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM BAR (mobile) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight text-neutral-900">{formatPrice(Number(product.price))}</p>
            {origPrice && origPrice > Number(product.price) && (
              <p className="text-xs text-neutral-400 line-through">{formatPrice(origPrice)}</p>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Button disabled={!inStock} onClick={handleAddToCart}
              className="h-11 w-full rounded-xl bg-[#EE7526] text-sm font-bold text-white shadow-md hover:bg-[#d8661c] disabled:opacity-50">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {inStock ? "Savatga qo'shish" : "Tugadi"}
            </Button>
            {inStock && (
              <p className="text-center text-[10px] text-emerald-600 font-medium">
                {product.delivery_free || product.delivery_fee === 0 ? "Bepul yetkazish" : formatPrice(product.delivery_fee) + " yetkazish"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom spacer so content isn't hidden behind sticky bar */}
      <div className="h-24 lg:hidden" />

      {/* ── LIGHTBOX ── */}
      {lightbox && current && !currentIsVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(false)}>
          <img src={current} alt={product.name}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} />
          <button className="absolute right-5 top-5 rounded-full bg-white/20 p-2.5 text-white transition hover:bg-white/40"
            onClick={() => setLightbox(false)}>✕</button>
          {allMedia.length > 1 && (
            <>
              <button className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                onClick={e => { e.stopPropagation(); goSlide(-1); }}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                onClick={e => { e.stopPropagation(); goSlide(1); }}>
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
