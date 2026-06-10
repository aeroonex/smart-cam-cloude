import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Gift, Heart,
  MessageSquare, Package, Pause, Play,
  RotateCcw, Send, Share2, ShieldCheck,
  ShoppingCart, Star, Truck, ZoomIn, ChevronRight,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductDetailSkeleton } from "@/components/Skeleton";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { shareNative } from "@/utils/share";
import { track } from "@/utils/analytics";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  }

  function shareProduct() {
    const priceText = product ? ` — ${product.price} so'm` : "";
    track("share", { product_id: product?.id ?? "" });
    void shareNative({
      title: product?.name,
      text: product ? `${product.name}${priceText} | HammaBop` : undefined,
      url: window.location.href,
    });
  }

  const allMedia: string[] = [
    ...(product?.images ?? []).map(normalizeImageUrl),
    ...(product?.videos ?? []),
  ];
  const current = allMedia[slide] ?? null;
  const currentIsVideo = current ? isVideo(current) : false;

  function goSlide(dir: number) {
    if (videoRef.current) videoRef.current.pause();
    setVideoPlaying(false);
    setSlide(s => (s + dir + allMedia.length) % allMedia.length);
  }

  if (loading) return <ProductDetailSkeleton />;

  if (!product) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <ShoppingCart className="h-16 w-16 text-neutral-200" />
      <p className="text-lg font-semibold text-neutral-600">Mahsulot topilmadi</p>
      <button onClick={() => navigate(-1)}
        className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white">
        Orqaga
      </button>
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
  const totalPrice = Number(product.price) * qty;

  return (
    <div className="min-h-screen bg-white pb-28">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-3 border-b border-neutral-100">
        <button onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5]">
          <ArrowLeft className="h-5 w-5 text-neutral-800" />
        </button>

        <h2 className="flex-1 truncate px-3 text-[15px] font-bold text-neutral-900">{product.name}</h2>

        <div className="flex items-center gap-2">
          <button onClick={() => setWished(w => !w)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5]">
            <Heart className={`h-4.5 w-4.5 ${wished ? "fill-red-500 text-red-500" : "text-neutral-700"}`} style={{ width: 18, height: 18 }} />
          </button>
          <button onClick={shareProduct}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5]">
            <Share2 className="text-neutral-700" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </header>

      {/* ══ GALLERY ══ */}
      <div
        className="relative bg-[#F5F5F5] select-none"
        style={{ aspectRatio: "1/1" }}
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
                onClick={() => {
                  if (videoRef.current) {
                    if (videoPlaying) videoRef.current.pause();
                    else void videoRef.current.play();
                    setVideoPlaying(!videoPlaying);
                  }
                }} />
              {!videoPlaying && (
                <button className="absolute inset-0 flex items-center justify-center"
                  onClick={() => { if (videoRef.current) { void videoRef.current.play(); setVideoPlaying(true); } }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
                    <Play className="h-7 w-7 fill-white" />
                  </div>
                </button>
              )}
              {videoPlaying && (
                <button className="absolute right-3 bottom-10 rounded-full bg-black/50 p-2 text-white"
                  onClick={() => { videoRef.current?.pause(); setVideoPlaying(false); }}>
                  <Pause className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <img src={current} alt={product.name}
                className="h-full w-full object-cover cursor-zoom-in"
                onClick={() => setLightbox(true)} />
              <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm cursor-zoom-in"
                onClick={() => setLightbox(true)}>
                <ZoomIn className="h-4 w-4 text-neutral-600" />
              </div>
            </>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingCart className="h-24 w-24 text-neutral-200" />
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-2xl bg-white px-5 py-2.5 text-base font-bold text-red-500">Tugadi</span>
          </div>
        )}

        {/* Discount badge */}
        {discountPct && inStock && (
          <div className="absolute left-3 top-3 rounded-xl bg-red-500 px-3 py-1 text-sm font-bold text-white">
            -{discountPct}%
          </div>
        )}

        {/* Slide dots */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {allMedia.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className="h-[6px] rounded-full transition-all duration-300"
                style={{ width: i === slide ? 20 : 6, background: i === slide ? "#111111" : "#D0D0D0" }} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
          {allMedia.map((url, i) => (
            <button key={i}
              onClick={() => { if (videoRef.current) videoRef.current.pause(); setVideoPlaying(false); setSlide(i); }}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                slide === i ? "border-neutral-900" : "border-neutral-200"
              }`}>
              {isVideo(url) ? (
                <div className="flex h-full items-center justify-center bg-neutral-100">
                  <Play className="h-4 w-4 text-neutral-500" />
                </div>
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ══ PRODUCT INFO ══ */}
      <div className="px-4 pt-3 space-y-4">

        {/* Name + category */}
        <div>
          {product.category && (
            <button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)}
              className="mb-1 text-[12px] font-semibold text-neutral-400 uppercase tracking-wide">
              {product.category}
            </button>
          )}
          <h1 className="text-[20px] font-extrabold leading-snug text-neutral-900">{product.name}</h1>
        </div>

        {/* Rating + sold + stock */}
        <div className="flex items-center gap-3 flex-wrap">
          {reviews.length > 0 ? (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />
                ))}
              </div>
              <span className="text-[13px] font-bold text-neutral-800">{avgRating.toFixed(1)}</span>
              <a href="#reviews" className="text-[12px] text-neutral-400">({reviews.length} izoh)</a>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-neutral-200 text-neutral-200" />)}
              <span className="text-[12px] text-neutral-400">Izoh yo'q</span>
            </div>
          )}

          <span className="text-[12px] text-neutral-400">{product.sold_count} ta sotildi</span>

          {!inStock ? (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-500">Tugadi</span>
          ) : lowStock ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">{product.stock_count} ta qoldi</span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">Mavjud</span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <p className="text-[26px] font-extrabold tracking-tight text-neutral-900">
            {formatPrice(Number(product.price))}
          </p>
          {origPrice && origPrice > Number(product.price) && (
            <p className="text-[14px] text-neutral-400 line-through">{formatPrice(origPrice)}</p>
          )}
          {discountPct && origPrice && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">-{discountPct}%</span>
          )}
        </div>

        {/* Cashback */}
        {product.cashback_amount > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-semibold text-neutral-700">
            <Gift className="h-3.5 w-3.5" />
            +{product.cashback_amount.toLocaleString()} so'm cashback
          </div>
        )}

        {/* Warranty */}
        {warranty && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> {warranty} kafolat
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-neutral-100" />

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-neutral-900">Tavsif</h3>
            <p className="text-[14px] leading-relaxed text-neutral-500 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Specs */}
        {specs && Object.keys(specs).length > 0 && (
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-neutral-900">Texnik xususiyatlar</h3>
            <div className="overflow-hidden rounded-2xl border border-neutral-100">
              {Object.entries(specs).map(([k, v], i) => (
                <div key={k} className={`flex gap-3 px-4 py-2.5 text-[13px] ${i % 2 === 0 ? "bg-[#F9F9F9]" : "bg-white"}`}>
                  <span className="w-32 shrink-0 text-neutral-500">{k}</span>
                  <span className="font-semibold text-neutral-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {sizes.length > 0 && (
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-neutral-900">O'lcham</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button key={s} onClick={() => setSelectedSize(s)}
                  className={`rounded-xl border-2 px-4 py-2 text-[13px] font-semibold transition ${
                    selectedSize === s
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {colors.length > 0 && (
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-neutral-900">
              Rang{selectedColor ? `: ${selectedColor}` : ""}
            </h3>
            <div className="flex flex-wrap gap-3">
              {colors.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)} title={c}
                  className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                    selectedColor === c ? "border-neutral-900 scale-110" : "border-neutral-200 hover:scale-105"
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

        {/* Quantity */}
        <div>
          <h3 className="mb-2 text-[15px] font-bold text-neutral-900">Soni</h3>
          <div className="inline-flex items-center gap-4 rounded-2xl border border-neutral-200 px-4 py-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-xl font-bold text-neutral-700 transition active:scale-90">
              −
            </button>
            <span className="w-8 text-center text-[16px] font-bold text-neutral-900">{qty}</span>
            <button onClick={() => setQty(q => Math.min(product.stock_count || 99, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xl font-bold text-white transition active:scale-90">
              +
            </button>
          </div>
        </div>

        {/* Delivery */}
        <div className="flex flex-wrap gap-4 rounded-2xl border border-neutral-100 bg-[#F9F9F9] px-4 py-3 text-[13px]">
          <div className="flex items-center gap-2 text-emerald-600">
            <Truck className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              {product.delivery_free || product.delivery_fee === 0 ? "Bepul yetkazish" : formatPrice(product.delivery_fee)}
            </span>
            <span className="text-neutral-400">· 3–7 kun</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-500">
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span>15 kun qaytarish</span>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          {[
            { icon: ShieldCheck, label: "Xavfsiz to'lov", color: "text-emerald-600" },
            { icon: RotateCcw, label: "15 kun qaytarish", color: "text-neutral-600" },
            { icon: BadgeCheck, label: "Kafolatli", color: "text-neutral-600" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#F5F5F5] py-3">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="font-medium text-neutral-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Nasiya */}
        <NasiyaCalculator price={Number(product.price)} />

        {/* Seller card */}
        <div className="rounded-2xl bg-[#F5F5F5] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="h-4 w-4 text-neutral-700" />
            <p className="text-[14px] font-bold text-neutral-800">HammaBop Rasmiy</p>
          </div>
          <p className="text-[12px] text-neutral-500">✓ Tekshirilgan sotuvchi · 98.5% ijobiy baho</p>
        </div>

        <a href="https://t.me/HammaBopSupport" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 py-3 text-[14px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          <MessageSquare className="h-4 w-4" />
          Savol bormi? Bog'laning
        </a>

        {/* ══ REVIEWS ══ */}
        <div id="reviews" className="pt-2">
          <h2 className="mb-4 text-[17px] font-extrabold text-neutral-900">
            Izohlar {reviews.length > 0 && <span className="text-neutral-400 font-normal text-[15px]">({reviews.length})</span>}
          </h2>

          {!reviewsSupported ? (
            <div className="rounded-2xl bg-neutral-50 p-4 text-[13px] text-neutral-500">Izohlar tizimi aktivlashtirilmoqda.</div>
          ) : (
            <>
              {reviews.length > 0 && (
                <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#F5F5F5] p-4">
                  <div className="text-center">
                    <p className="text-5xl font-extrabold text-neutral-900">{avgRating.toFixed(1)}</p>
                    <div className="mt-1 flex gap-0.5 justify-center">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">{reviews.length} ta izoh</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(n => (
                      <div key={n} className="flex items-center gap-2 text-[12px]">
                        <span className="w-5 font-bold text-neutral-600 text-right">{n}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                          <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct(reviews, n)}%` }} />
                        </div>
                        <span className="w-8 text-right text-neutral-400">{pct(reviews, n)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review form */}
              {!user ? (
                <div className="mb-4 rounded-2xl border-2 border-dashed border-neutral-200 p-6 text-center">
                  <p className="mb-3 text-[14px] text-neutral-500">Izoh qoldirish uchun kiring</p>
                  <Link to="/login"
                    className="inline-flex items-center rounded-2xl bg-black px-6 py-2.5 text-[13px] font-semibold text-white">
                    Kirish
                  </Link>
                </div>
              ) : myPendingReview ? (
                <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <p className="font-bold text-amber-800 text-[14px]">⏳ Izohingiz moderatsiyada</p>
                  <p className="mt-1 text-[13px] text-amber-700">Admin tasdiqlashini kuting.</p>
                </div>
              ) : myReview ? (
                <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="font-bold text-emerald-800 text-[14px]">✓ Sizning izohingiz</p>
                  <div className="mt-1 flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />)}
                  </div>
                  {myReview.comment && <p className="mt-1 text-[13px] text-neutral-700">{myReview.comment}</p>}
                </div>
              ) : canReview ? (
                <div className="mb-4 rounded-2xl border border-neutral-200 p-4">
                  <h3 className="mb-3 text-[15px] font-bold text-neutral-800">Izoh qoldiring</h3>
                  <div className="mb-3 flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRatingInput(s)}>
                        <Star className={`h-8 w-8 transition-all ${s <= ratingInput ? "fill-amber-400 text-amber-400 scale-110" : "text-neutral-300"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={commentInput} onChange={e => setCommentInput(e.target.value)}
                    placeholder="Mahsulot haqida fikringizni yozing..."
                    className="mb-3 min-h-24 rounded-2xl border-neutral-200 bg-[#F5F5F5] focus:border-neutral-900 focus:ring-0" rows={3} />
                  <button onClick={() => void submitReview()} disabled={submitting}
                    className="flex items-center gap-2 rounded-2xl bg-black px-6 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Yuborilmoqda..." : "Yuborish"}
                  </button>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-neutral-100 bg-[#F9F9F9] p-4">
                  <Package className="h-5 w-5 shrink-0 text-neutral-400" />
                  <p className="text-[13px] text-neutral-500">Izoh qoldirish uchun mahsulotni sotib oling.</p>
                </div>
              )}

              {/* Reviews list */}
              {reviewsLoading ? (
                <div className="py-8 text-center text-neutral-400 text-[14px]">Yuklanmoqda...</div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <MessageSquare className="h-10 w-10 text-neutral-200" />
                  <p className="text-[14px] text-neutral-400">Hali izoh yo'q. Birinchi bo'lib yozing!</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {reviews.map(review => (
                    <div key={review.id} className="flex gap-3 py-4">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-[#F5F5F5] font-bold text-[13px] text-neutral-700">
                          {getInitials(review.users?.full_name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-bold text-neutral-900">{review.users?.full_name ?? "Foydalanuvchi"}</p>
                          <span className="text-[11px] text-neutral-400">{new Date(review.created_at).toLocaleDateString("uz-UZ")}</span>
                        </div>
                        <div className="mb-1 flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}`} />)}
                        </div>
                        {review.comment && <p className="text-[13px] leading-relaxed text-neutral-600">{review.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ══ RELATED PRODUCTS ══ */}
        {related.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-extrabold text-neutral-900">O'xshash mahsulotlar</h2>
              {product.category && (
                <button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category!)}`)}
                  className="flex items-center gap-1 text-[13px] font-semibold text-neutral-500">
                  Barchasi <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {related.map(p => {
                const pDiscount = (p as unknown as { discount_percent?: number }).discount_percent;
                const pOrig = (p as unknown as { original_price?: number }).original_price;
                const pInStock = p.stock_count > 0;
                return (
                  <Link key={p.id} to={`/product/${p.id}`}
                    className="flex flex-col overflow-hidden rounded-2xl bg-white border border-neutral-100 transition active:scale-[0.98]">
                    <div className="relative bg-[#F5F5F5]" style={{ paddingBottom: "100%" }}>
                      {p.images?.[0] ? (
                        <img src={normalizeImageUrl(p.images[0])} alt={p.name}
                          className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-neutral-200" />
                        </div>
                      )}
                      {pDiscount && (
                        <div className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          -{pDiscount}%
                        </div>
                      )}
                      {!pInStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-red-500">Tugadi</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col p-3">
                      <p className="line-clamp-2 text-[12px] font-medium text-neutral-700">{p.name}</p>
                      <p className="mt-1.5 text-[14px] font-extrabold text-neutral-900">{formatPrice(Number(p.price))}</p>
                      {pOrig && pOrig > Number(p.price) && (
                        <p className="text-[10px] text-neutral-400 line-through">{formatPrice(pOrig)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ STICKY BOTTOM BAR ══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100 px-4 py-3"
        style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-neutral-400 font-medium">Jami narx</p>
            <p className="text-[20px] font-extrabold text-neutral-900">{formatPrice(totalPrice)}</p>
          </div>
          <button disabled={!inStock} onClick={handleAddToCart}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-[15px] font-bold text-white disabled:opacity-50 transition active:scale-[0.98]">
            <ShoppingCart className="h-5 w-5" />
            {inStock ? "Savatga qo'shish" : "Tugadi"}
          </button>
        </div>
      </div>

      {/* ══ LIGHTBOX ══ */}
      {lightbox && current && !currentIsVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}>
          <img src={current} alt={product.name}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={e => e.stopPropagation()} />
          <button className="absolute right-5 top-5 rounded-full bg-white/20 p-2.5 text-white"
            onClick={() => setLightbox(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
