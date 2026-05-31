import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Gift, Heart, Loader2, MessageSquare, Package, Pause, Play,
  Send, Share2, ShoppingCart, Star, Truck, ZoomIn, ChevronLeft, ChevronRight,
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
  return Math.round((reviews.filter((r) => r.rating === n).length / reviews.length) * 100);
}

const COLORS_PALETTE: Record<string, string> = {
  "Qizil": "#ef4444", "Ko'k": "#3b82f6", "Yashil": "#22c55e",
  "Sariq": "#eab308", "Oq": "#f9fafb", "Qora": "#1f2937",
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

  useEffect(() => {
    if (!id) return;
    void loadProduct();
    void loadReviews();
    void track(id);
  }, [id]);

  async function loadProduct() {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("id", id!).single();
    setProduct(data as Product | null);
    if ((data as Product)?.category) {
      const { data: rel } = await supabase.from("products").select("*")
        .eq("category", (data as Product).category!)
        .eq("status", "active").neq("id", id!).limit(8);
      setRelated((rel as Product[]) ?? []);
    }
    setLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase.from("product_reviews")
        .select("*, users(full_name, avatar_url)")
        .eq("product_id", id!).order("created_at", { ascending: false });
      if (error) { setReviewsSupported(false); setReviews([]); }
      else {
        const list = (data as Review[]) ?? [];
        setReviews(list);
        if (user) setMyReview(list.find((r) => r.user_id === user.id) ?? null);
      }
    } catch { setReviewsSupported(false); setReviews([]); }
    setReviewsLoading(false);
  }

  async function submitReview() {
    if (!user) { navigate("/login"); return; }
    if (!commentInput.trim()) { toast.error("Izoh yozing."); return; }
    setSubmitting(true);
    try {
      if (myReview) {
        await supabase.from("product_reviews").update({ rating: ratingInput, comment: commentInput.trim() }).eq("id", myReview.id);
      } else {
        await supabase.from("product_reviews").insert({ product_id: id!, user_id: user.id, rating: ratingInput, comment: commentInput.trim() });
      }
      setCommentInput("");
      await loadReviews();
      toast.success("Izoh qo'shildi!");
    } catch { toast.error("Izoh yuborilmadi."); }
    setSubmitting(false);
  }

  function handleAddToCart() {
    if (!product) return;
    const sizes = product.sizes ?? [];
    const colors = product.colors ?? [];
    if (sizes.length > 0 && !selectedSize) { toast.error("O'lchamni tanlang"); return; }
    if (colors.length > 0 && !selectedColor) { toast.error("Rangni tanlang"); return; }
    for (let i = 0; i < qty; i++) addToCart(product);
    toast.success(`${product.name} savatga qo'shildi!`);
  }

  function shareToTelegram() {
    if (!product) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(
      `${product.name}\n💰 ${formatPrice(Number(product.price))}\n\nHammaBop.uz da ko'rish:`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const allMedia: string[] = [...(product?.images ?? []), ...(product?.videos ?? [])];
  const current = allMedia[slide] ?? null;
  const currentIsVideo = current ? isVideo(current) : false;

  function goSlide(dir: number) {
    if (videoRef.current) videoRef.current.pause();
    setVideoPlaying(false);
    setSlide((s) => (s + dir + allMedia.length) % allMedia.length);
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
      <Loader2 className="h-10 w-10 animate-spin text-[#EE7526]" />
    </div>
  );

  if (!product) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f5f5]">
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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="sticky top-0 z-40 bg-[#EE7526] shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-white">
            <HammaBopLogo size={30} dark />
            <span className="hidden font-extrabold sm:block">Hamma<span className="text-orange-200">Bop</span></span>
          </Link>
          <button onClick={() => navigate(-1)}
            className="ml-2 flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30">
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500">
          <Link to="/" className="hover:text-[#EE7526]">HammaBop</Link>
          {product.category && (<><span>›</span><button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)} className="hover:text-[#EE7526]">{product.category}</button></>)}
          <span>›</span>
          <span className="line-clamp-1 text-neutral-700">{product.name}</span>
        </nav>

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-8 lg:grid-cols-[auto_1fr_320px]">

            {/* ── Gallery ── */}
            <div className="flex gap-3">
              {allMedia.length > 1 && (
                <div className="hidden flex-col gap-2 sm:flex" style={{ width: 68 }}>
                  {allMedia.map((url, i) => (
                    <button key={i} onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${slide === i ? "border-[#EE7526]" : "border-transparent hover:border-orange-200"}`}>
                      {isVideo(url) ? (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                          <Play className="h-5 w-5 text-[#EE7526]" />
                        </div>
                      ) : (
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="group relative overflow-hidden rounded-xl bg-neutral-50" style={{ width: 400, height: 400 }}>
                  {current ? (
                    currentIsVideo ? (
                      <>
                        <video ref={videoRef} src={current} className="h-full w-full object-cover" loop playsInline
                          onClick={() => { if (videoRef.current) { if (videoPlaying) videoRef.current.pause(); else void videoRef.current.play(); setVideoPlaying(!videoPlaying); } }} />
                        <button className="absolute inset-0 flex items-center justify-center"
                          onClick={() => { if (videoRef.current) { if (videoPlaying) videoRef.current.pause(); else void videoRef.current.play(); setVideoPlaying(!videoPlaying); } }}>
                          {!videoPlaying && (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
                              <Play className="h-8 w-8 fill-white" />
                            </div>
                          )}
                        </button>
                      </>
                    ) : (
                      <img src={current} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105 cursor-zoom-in" onClick={() => setLightbox(true)} />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><ShoppingCart className="h-20 w-20 text-orange-100" /></div>
                  )}

                  {!currentIsVideo && current && (
                    <div className="absolute right-3 top-3 rounded-full bg-white/80 p-1.5 opacity-0 shadow transition group-hover:opacity-100 cursor-zoom-in" onClick={() => setLightbox(true)}>
                      <ZoomIn className="h-4 w-4 text-neutral-600" />
                    </div>
                  )}

                  {allMedia.length > 1 && (
                    <>
                      <button onClick={() => goSlide(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
                      <button onClick={() => goSlide(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
                    </>
                  )}

                  {currentIsVideo && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">VIDEO</span>
                  )}

                  {/* Stock badge overlay */}
                  {!inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="rounded-xl bg-red-500 px-4 py-2 text-lg font-bold text-white">Tugadi</span>
                    </div>
                  )}
                </div>

                {allMedia.length > 1 && (
                  <div className="mt-3 flex justify-center gap-1.5">
                    {allMedia.map((url, i) => (
                      <button key={i} onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
                        className={`h-2 rounded-full transition-all ${i === slide ? "w-5 bg-[#EE7526]" : isVideo(url) ? "w-2 bg-blue-300" : "w-2 bg-neutral-300"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Info ── */}
            <div className="space-y-4">
              <h1 className="text-xl font-bold leading-snug text-neutral-900 sm:text-2xl">{product.name}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
                    ))}
                    <span className="ml-1 font-bold text-amber-500">{avgRating.toFixed(1)}</span>
                  </div>
                )}
                <a href="#reviews" className="text-[#EE7526] hover:underline">{reviews.length} ta izoh</a>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500">{product.sold_count} ta sotildi</span>
                {product.category && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-[#EE7526]">{product.category}</span>
                )}
              </div>

              {/* Stock status */}
              <div className="flex items-center gap-2">
                {!inStock ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Tugadi
                  </span>
                ) : lowStock ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Faqat {product.stock_count} ta qoldi!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Omborda bor
                  </span>
                )}

                {/* Cashback badge */}
                {product.cashback_amount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-[#EE7526]">
                    <Gift className="h-3.5 w-3.5" /> +{product.cashback_amount.toLocaleString()} cashback
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-3xl font-extrabold text-neutral-900">{formatPrice(Number(product.price))}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {product.delivery_free ? (
                    <span className="text-emerald-600 font-medium">✓ Bepul yetkazib berish</span>
                  ) : product.delivery_fee > 0 ? (
                    <span>Yetkazish: {formatPrice(product.delivery_fee)}</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">✓ Bepul yetkazib berish</span>
                  )}
                </p>
              </div>

              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-neutral-700">O'lcham:</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button key={s} onClick={() => setSelectedSize(s)}
                        className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                          selectedSize === s ? "border-[#EE7526] bg-orange-50 text-[#EE7526]" : "border-neutral-200 hover:border-neutral-300"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {colors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-neutral-700">
                    Rang: {selectedColor && <span className="text-[#EE7526]">{selectedColor}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button key={c} onClick={() => setSelectedColor(c)}
                        title={c}
                        className={`relative h-9 w-9 rounded-full border-2 transition ${
                          selectedColor === c ? "border-[#EE7526] scale-110 shadow-md" : "border-neutral-200 hover:border-neutral-400"
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

              {product.description && (
                <div>
                  <h3 className="mb-1.5 font-semibold text-neutral-800">Tavsif</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{product.description}</p>
                </div>
              )}

              {specs && Object.keys(specs).length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-neutral-800">Xususiyatlar</h3>
                  <dl className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 text-sm">
                    {Object.entries(specs).map(([k, v]) => (
                      <div key={k} className="flex gap-4 px-4 py-2.5">
                        <dt className="w-36 shrink-0 text-neutral-400">{k}</dt>
                        <dd className="text-neutral-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-4 text-sm">
                <div className="flex items-center gap-3 text-emerald-600">
                  <Truck className="h-4 w-4" />
                  <span className="font-medium">{product.delivery_free || product.delivery_fee === 0 ? "Bepul yetkazib berish" : `Yetkazish: ${formatPrice(product.delivery_fee)}`}</span>
                  <span className="text-neutral-400">· 3–7 kun</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-500">
                  <Package className="h-4 w-4" />
                  <span>Kafolatli qaytarish · 15 kun</span>
                </div>
              </div>

              {/* Nasiya Calculator */}
              <NasiyaCalculator price={Number(product.price)} />
            </div>

            {/* ── Buy box ── */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-neutral-100 p-5 shadow-sm">
                <p className="mb-1 text-2xl font-extrabold text-neutral-900">{formatPrice(Number(product.price))}</p>

                {/* Cashback info */}
                {product.cashback_amount > 0 && (
                  <p className="mb-3 flex items-center gap-1 text-xs text-[#EE7526] font-medium">
                    <Gift className="h-3.5 w-3.5" /> Xariddan {product.cashback_amount.toLocaleString()} so'm cashback
                  </p>
                )}

                <div className="mb-4 flex items-center gap-3">
                  <span className="text-sm text-neutral-500">Miqdor:</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-neutral-200">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-50">−</button>
                    <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(product.stock_count || 99, q + 1))} className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-50">+</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button disabled={!inStock}
                    className="h-12 w-full rounded-xl bg-[#EE7526] text-base font-bold text-white hover:bg-[#d8661c] disabled:opacity-60"
                    onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {inStock ? "Savatga" : "Tugadi"}
                  </Button>
                  {/* 1-Click buy */}
                  <Button variant="outline" disabled={!inStock}
                    className="h-11 w-full rounded-xl border-[#EE7526] text-[#EE7526] hover:bg-orange-50 disabled:opacity-60"
                    onClick={() => { if (!user) { navigate("/login"); return; } handleAddToCart(); navigate("/"); }}>
                    Hozir sotib olish ⚡
                  </Button>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => setWished((w) => !w)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Heart className={`h-4 w-4 ${wished ? "fill-red-500 text-red-500" : ""}`} />
                    {wished ? "Sevimli" : "Sevimlilar"}
                  </button>
                  <button onClick={shareToTelegram}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Share2 className="h-4 w-4" /> Ulashish
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-100 p-4 text-sm">
                <p className="font-semibold text-neutral-800">HammaBop Rasmiy Do'kon</p>
                <p className="text-neutral-500">98.5% ijobiy baho</p>
                <p className="text-[#EE7526]">✓ Tekshirilgan sotuvchi</p>
              </div>

              {/* Support */}
              <a
                href="https://t.me/HammaBopSupport"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <MessageSquare className="h-4 w-4" />
                Savol bormi? Admin bilan bog'lanish
              </a>
            </div>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div id="reviews" className="mb-4 rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-neutral-900">
            <MessageSquare className="h-5 w-5 text-[#EE7526]" /> Izohlar va reytinglar
          </h2>

          {!reviewsSupported ? (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">Izohlar tizimi aktivlashtirilmoqda.</div>
          ) : (
            <>
              {reviews.length > 0 && (
                <div className="mb-8 flex flex-col gap-6 sm:flex-row">
                  <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-orange-50 px-10 py-6">
                    <p className="text-5xl font-extrabold text-neutral-900">{avgRating.toFixed(1)}</p>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => (<Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />))}</div>
                    <p className="text-sm text-neutral-500">{reviews.length} ta izoh</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map((n) => (
                      <div key={n} className="flex items-center gap-3 text-sm">
                        <div className="flex w-8 items-center gap-0.5">
                          <span className="font-semibold text-neutral-700">{n}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct(reviews, n)}%` }} />
                        </div>
                        <span className="w-8 text-right text-neutral-400">{pct(reviews, n)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user ? (
                <div className="mb-8 rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                  <h3 className="mb-3 font-semibold">{myReview ? "Izohingizni tahrirlash" : "Izoh qoldiring"}</h3>
                  <div className="mb-3 flex gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <button key={s} onClick={() => setRatingInput(s)}>
                        <Star className={`h-7 w-7 transition ${s <= ratingInput ? "fill-amber-400 text-amber-400" : "text-neutral-300 hover:text-amber-300"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Mahsulot haqida fikringizni yozing..." className="mb-3 min-h-24 rounded-xl border-orange-100 bg-white" rows={3} />
                  <Button onClick={() => void submitReview()} disabled={submitting}
                    className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {myReview ? "Yangilash" : "Yuborish"}
                  </Button>
                </div>
              ) : (
                <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 p-5 text-center">
                  <p className="mb-3 text-sm text-neutral-600">Izoh qoldirish uchun kiring</p>
                  <Button asChild className="rounded-full bg-[#EE7526] text-white"><Link to="/login">Kirish</Link></Button>
                </div>
              )}

              {reviewsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>
              ) : reviews.length === 0 ? (
                <p className="py-8 text-center text-neutral-400">Hali izoh yo'q. Birinchi bo'lib yozing!</p>
              ) : (
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <div key={review.id} className="flex gap-4 border-t border-neutral-100 pt-5">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-orange-100 font-semibold text-[#EE7526]">
                          {getInitials(review.users?.full_name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-900">{review.users?.full_name ?? "Foydalanuvchi"}</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((s) => (<Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />))}
                          </div>
                          <span className="text-xs text-neutral-400">{new Date(review.created_at).toLocaleDateString("uz-UZ")}</span>
                        </div>
                        {review.comment && <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{review.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
            <h2 className="mb-5 text-xl font-bold text-neutral-900">O'xshash mahsulotlar</h2>
            <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {related.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="group flex flex-col bg-white transition hover:shadow-md">
                  <div className="relative overflow-hidden bg-neutral-50" style={{ paddingBottom: "100%" }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-50"><ShoppingCart className="h-8 w-8 text-orange-200" /></div>
                    )}
                    {p.stock_count === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white">Tugadi</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs text-neutral-700">{p.name}</p>
                    <p className="mt-1 font-bold text-[#EE7526]">{formatPrice(Number(p.price))}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && current && !currentIsVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={() => setLightbox(false)}>
          <img src={current} alt={product.name} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-5 top-5 rounded-full bg-white/20 p-2 text-white hover:bg-white/40" onClick={() => setLightbox(false)}>✕</button>
          {allMedia.length > 1 && (
            <>
              <button className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); goSlide(-1); }}><ChevronLeft className="h-6 w-6" /></button>
              <button className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); goSlide(1); }}><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
