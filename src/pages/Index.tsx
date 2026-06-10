import { useEffect, useMemo, useRef, useState } from "react"; // dark mode removed
import {
  CheckCircle2, ChevronDown, Heart, Home, LayoutDashboard, Loader2,
  LogOut, MapPin, MessageCircle, Package, Play, Search, ShieldCheck, ShoppingCart, Sparkles, Star, UserRound, Wallet,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartSheet } from "@/components/CartSheet";
import { OrderSuccess } from "@/components/OrderSuccess";
import { CategoryMenu } from "@/components/CategoryMenu";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { HammaBopLogo } from "@/components/HammaBopLogo";
import { BottomNav } from "@/components/BottomNav";
import { HeroBanner } from "@/components/HeroBanner";
import { OrdersList } from "@/components/OrdersList";
import { ProductCard } from "@/components/ProductCard";
import { ProfileDialog } from "@/components/ProfileDialog";
import { PromoSection } from "@/components/PromoSection";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { VideoCatalog } from "@/components/VideoCatalog";
import { WalletCard } from "@/components/WalletCard";
import { useSessionContext } from "@/components/session-context-provider";
import { useCart } from "@/hooks/useCart";
import { useCurrency, type Currency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import { useWishlist } from "@/hooks/useWishlist";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useWallet } from "@/hooks/useWallet";
import type { Lang } from "@/lib/i18n";
import { regions } from "@/constants";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCardSkeleton, CategoryIconsSkeleton, SaleCardSkeleton } from "@/components/Skeleton";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/format";
import { haptic } from "@/utils/haptic";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";

type OrderItem = { product_id: string; product_name: string; price: number; quantity: number };
type Tab = "sale" | "recommended" | "top";
type ActiveSection = "home" | "catalog" | "orders" | "wallet";
type PromoSectionRow = Database["public"]["Tables"]["promo_sections"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

function h(id: string, salt: number) {
  let v = salt;
  for (let i = 0; i < id.length; i++) v = (v * 31 + id.charCodeAt(i)) & 0xffff;
  return v;
}

// Countdown timer to midnight
function useSaleTimer() {
  const getRemaining = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
  };
  const [time, setTime] = useState(getRemaining);
  useEffect(() => {
    const t = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

const CATEGORY_ICONS = [
  { key: "Kiyim-kechak", label: "Kiyim" },
  { key: "Poyabzal", label: "Poyabzal" },
  { key: "Sumkalar", label: "Sumkalar" },
  { key: "Kompyuter & Noutbuk", label: "Elektron" },
  { key: "Soatlar & Zargarlik", label: "Soatlar" },
  { key: "Go'zallik & Parfyumeriya", label: "Go'zallik" },
  { key: "Uy va ofis", label: "Oshxona" },
  { key: "O'yinlar & Hobby", label: "O'yinlar" },
];

const Index = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, user, signOut } = useSessionContext();
  const { products, loading: productsLoading } = useProducts();
  const queryClient = useQueryClient();
  const { cart, cartCount, cartTotal, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(user);
  const { profile, form, setForm, saving, profileOpen, setProfileOpen, save, upsertForOrder } = useProfile(user);
  const { currency, setCurrency, format: formatPrice } = useCurrency();
  const { t, lang, setLang } = useI18n();
  const { wishlistIds, toggleWishlist, inWishlist } = useWishlist(user);
  const { viewedIds, track: trackViewed } = useRecentlyViewed(user);
  const { walletBalance, cashbackBalance, referralCode, transactions: walletTxs, ensureReferralCode } = useWallet(user);
  const saleTimer = useSaleTimer();

  const [region, setRegion] = useState<string>(() => localStorage.getItem("hammabop_region") ?? "Toshkent shahri");
  const chooseRegion = (r: string) => { setRegion(r); localStorage.setItem("hammabop_region", r); };
  const CURRENCIES: Currency[] = ["UZS", "USD", "RUB"];
  const LANGS: { code: Lang; label: string }[] = [{ code: "uz", label: "UZ" }, { code: "ru", label: "RU" }];

  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState<string | null>(null);

  // Telegram connection state — synced from profile + realtime updates
  const [tgConnected, setTgConnected] = useState<boolean>(false);
  useEffect(() => {
    setTgConnected(typeof profile?.telegram_id === "number");
  }, [profile?.telegram_id]);
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`tg-status-${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "users",
        filter: `id=eq.${user.id}`,
      }, (ev) => {
        const newTgId = (ev.new as { telegram_id?: number | null })?.telegram_id;
        setTgConnected(typeof newTgId === "number");
        if (typeof newTgId === "number") {
          toast.success("Telegram muvaffaqiyatli ulandi! ✓");
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<ActiveSection>("home");
  useEffect(() => {
    const s = (location.state as { section?: string } | null)?.section;
    if (s === "wallet") { setActiveSection("wallet"); return; }
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "catalog") setActiveSection("catalog");
    else if (tabParam === "orders") setActiveSection("orders");
    else if (!tabParam) setActiveSection("home");
  }, [location.state, location.search]);
  const [catalogCategory, setCatalogCategory] = useState("");
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("recommended");
  const [searchInput, setSearchInput] = useState("");
  const [videoCatalogOpen, setVideoCatalogOpen] = useState(false);
  const [walletBannerHidden, setWalletBannerHidden] = useState(false);

  const { data: adminData } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("role").eq("id", user!.id).single();
      return data?.role === "admin";
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const isAdmin = adminData ?? false;

  const { data: promoSections = [] } = useQuery<PromoSectionRow[]>({
    queryKey: ["promoSections"],
    queryFn: async () => {
      const { data } = await supabase.from("promo_sections").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const displayed = useMemo(() => {
    if (tab === "sale") return [...products].sort((a, b) => h(a.id, 7) % 60 - h(b.id, 7) % 60).reverse();
    if (tab === "top") return [...products].sort((a, b) => h(b.id, 99) - h(a.id, 99));
    return products.filter((p) => p.is_recommended);
  }, [products, tab]);

  const saleProducts = useMemo(() =>
    [...products].sort((a, b) => h(a.id, 7) % 60 - h(b.id, 7) % 60).reverse().slice(0, 10),
    [products]);

  const recentProducts = useMemo(() =>
    viewedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => !!p)
      .slice(0, 12),
    [viewedIds, products]);

  const CHUNK = 6;
  type FeedBlock =
    | { type: "products"; items: Product[] }
    | { type: "promo"; section: PromoSectionRow; sectionProducts: Product[] };

  const feedBlocks = useMemo<FeedBlock[]>(() => {
    const blocks: FeedBlock[] = [];
    const sorted = [...promoSections].sort((a, b) => a.sort_order - b.sort_order);
    let pi = 0;
    let si = 0;
    while (pi < displayed.length || si < sorted.length) {
      if (pi < displayed.length) {
        blocks.push({ type: "products", items: displayed.slice(pi, pi + CHUNK) });
        pi += CHUNK;
      }
      if (si < sorted.length) {
        const s = sorted[si];
        blocks.push({ type: "promo", section: s, sectionProducts: products.filter(p => s.product_ids.includes(p.id)) });
        si++;
      }
    }
    return blocks;
  }, [displayed, promoSections, products]);

  const goHome = () => { setActiveSection("home"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goCatalog = (cat = "") => { setActiveSection("catalog"); setCatalogCategory(cat); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const showOrders = async () => {
    if (!user) { navigate("/login"); return; }
    setActiveSection("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      await reloadOrders();
    } catch {
      toast.error("Buyurtmalarni yuklashda xato yuz berdi.");
    }
  };

  const openCheckout = () => {
    if (!user) { navigate("/login"); return; }
    setForm((prev) => ({
      ...prev,
      full_name: profile?.full_name ?? prev.full_name,
      phone: profile?.phone ?? prev.phone,
      region: profile?.region ?? prev.region,
    }));
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const placeOrder = async (opts: {
    paymentMethod: string; promoCode?: string;
    discountAmount: number; deliveryFee: number; addressDetail?: string; walletUsed?: number;
  }) => {
    if (!user) { navigate("/login"); return; }
    if (!cart.length) { toast.error("Savat hozircha bo'sh."); return; }
    if (!form.full_name || !form.phone || !form.region) {
      toast.error("Buyurtma uchun ism, telefon va hududni kiriting."); return;
    }
    setPlacingOrder(true);
    try {
      const profileOk = await upsertForOrder(user);
      if (!profileOk) return;

      const orderItems: OrderItem[] = cart.map((item) => ({
        product_id: item.id, product_name: item.name, price: item.price, quantity: item.qty,
      }));

      const walletDeduction = opts.walletUsed ?? 0;
      const finalTotal = Math.max(0, cartTotal - opts.discountAmount) + opts.deliveryFee - walletDeduction;

      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id, items: orderItems, total_amount: finalTotal, status: "yangi",
        payment_status: "unpaid", customer_name: form.full_name, customer_phone: form.phone,
        customer_region: form.region, notes: form.notes || null,
        payment_method: opts.paymentMethod,
        promo_code: opts.promoCode ?? null,
        discount_amount: opts.discountAmount,
        order_delivery_fee: opts.deliveryFee,
        address_detail: opts.addressDetail ?? null,
      }).select("*").single();

      if (error) {
        toast.error("Buyurtma yuborilmadi. Iltimos, qayta urinib ko'ring.");
        return;
      }

      // Buyurtma muvaffaqiyatli — endi savat va UI yangilanadi
      clearCart();
      setCheckoutOpen(false);
      setForm((prev) => ({ ...prev, notes: "" }));
      setSuccessOrderId(order.id);

      // Hamyon / cashback ayirish (ishlatilgan bo'lsa)
      if (walletDeduction > 0) {
        const totalBal = cashbackBalance + walletBalance;
        const newCashback = Math.max(0, cashbackBalance - walletDeduction);
        const remainingDeduction = walletDeduction - cashbackBalance;
        const newWallet = remainingDeduction > 0 ? Math.max(0, walletBalance - remainingDeduction) : walletBalance;
        const { error: wErr } = await supabase
          .from("users")
          .update({ cashback_balance: newCashback, wallet_balance: newWallet })
          .eq("id", user.id);
        if (wErr) console.error("[wallet deduction]", wErr);
        else toast.success(`Hamyondan −${walletDeduction.toLocaleString()} so'm ishlatildi`);
        void totalBal; // suppress unused warning
      }

      // Cashback — RPC orqali atomik increment (stale closure muammosini oldini oladi)
      const totalCashback = cart.reduce((sum, item) => {
        const p = products.find((pr) => pr.id === item.id);
        return sum + (p?.cashback_amount ?? 0) * item.qty;
      }, 0);
      if (totalCashback > 0) {
        const { error: cbErr } = await supabase.rpc("increment_cashback", {
          user_id: user.id,
          amount: totalCashback,
        });
        if (cbErr) {
          // RPC mavjud bo'lmasa fallback: re-fetch qilib yangilaymiz
          const { data: fresh } = await supabase.from("users").select("cashback_balance").eq("id", user.id).single();
          const current = fresh?.cashback_balance ?? 0;
          await supabase.from("users").update({ cashback_balance: current + totalCashback }).eq("id", user.id);
        }
        toast.success(`${totalCashback.toLocaleString()} so'm cashback yig'ildi!`);
      }

      if (opts.promoCode) {
        const { data: promo } = await supabase
          .from("promo_codes").select("uses_count").eq("code", opts.promoCode).single();
        if (promo) {
          const { error: promoErr } = await supabase
            .from("promo_codes").update({ uses_count: promo.uses_count + 1 }).eq("code", opts.promoCode);
          if (promoErr) console.error("[promo increment]", promoErr);
        }
      }

      await reloadOrders();
    } catch (err) {
      console.error("[placeOrder]", err);
      toast.error("Buyurtma berishda kutilmagan xato yuz berdi.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const openTelegramLink = async (type: "connect" | "order", orderId?: string) => {
    if (!user) { navigate("/login"); return; }
    const key = orderId ?? type;
    setTelegramLinkLoading(key);
    const { data, error } = await supabase.functions.invoke("telegram-link", { body: { type, orderId } });
    setTelegramLinkLoading(null);
    if (error || !data?.url) { toast.error("Telegram havolasini yaratib bo'lmadi."); return; }
    window.open(data.url as string, "_blank", "noopener,noreferrer");
  };

  const doSearch = () => {
    const term = searchInput.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  // Unique delivery provider fee (sum per provider, once each)
  const checkoutDeliveryFee = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const item of cart) {
      if (item.delivery_provider_id && !seen.has(item.delivery_provider_id)) {
        seen.add(item.delivery_provider_id);
        total += item.delivery_provider_fee ?? 0;
      }
    }
    return total;
  })();

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        await reloadOrders?.();
      }}
    >
    <div className="min-h-screen bg-white pb-28">

      {/* ── TOP BAR (Evira style) ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1280px] px-4 pt-4 pb-3">

          {/* Row 1: Greeting + icons */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] text-neutral-400 font-medium">
                {new Date().getHours() < 12 ? "Good Morning 🌤️" : new Date().getHours() < 18 ? "Good Afternoon ☀️" : "Good Evening 🌙"}
              </p>
              <p className="text-[17px] font-bold text-neutral-900 leading-tight">
                {profile?.full_name?.split(" ")[0] ?? (user ? "Salom!" : "Mehmon")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Lang */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-600">{lang.toUpperCase()}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl z-50">
                  {LANGS.map((l) => (
                    <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}
                      className={`rounded-lg text-sm ${lang === l.code ? "font-semibold" : ""}`}>{l.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Wishlist */}
              <button onClick={() => navigate("/wishlist")} className="relative w-9 h-9 flex items-center justify-center rounded-full border border-neutral-200">
                <Heart className={`h-[18px] w-[18px] ${wishlistIds.length > 0 ? "fill-red-500 text-red-500" : "text-neutral-700"}`} />
                {wishlistIds.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {wishlistIds.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Search + location */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#F5F5F5] rounded-2xl px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
                placeholder={t("search_placeholder")}
                className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="text-neutral-400 text-sm">✕</button>
              )}
            </div>
            {/* Location filter button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#F5F5F5] shrink-0">
                  <MapPin className="h-4 w-4 text-neutral-700" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto rounded-xl z-50">
                {regions.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => chooseRegion(r)}
                    className={`rounded-lg text-sm ${region === r ? "font-semibold" : ""}`}>{r}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-[1280px]">
        {activeSection === "home" ? (
          <>
            {/* Wallet/cashback banner */}
            {user && (walletBalance + cashbackBalance) > 0 && !walletBannerHidden && (
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[#F5F5F5] px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black flex-shrink-0">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px]">
                    {(walletBalance + cashbackBalance).toLocaleString()} so'm
                  </p>
                  <p className="text-xs text-neutral-500">hamyoningizdagi bonus mablag'</p>
                </div>
                <button onClick={() => setWalletBannerHidden(true)} className="p-1 text-neutral-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Special Offers — Hero Banner */}
            <div className="mx-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[16px] text-neutral-900">Special Offers</h2>
                <button className="text-[13px] text-neutral-400 font-medium">See All</button>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <HeroBanner />
              </div>
            </div>

            {/* Category icons — Evira style: simple gray circles */}
            <div className="mt-5 px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[16px] text-neutral-900">Kategoriyalar</h2>
                <button onClick={() => goCatalog()} className="text-[13px] text-neutral-400 font-medium">See All</button>
              </div>
              <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-4 pb-1" style={{ width: "max-content" }}>
                  {[
                    { key: "Kiyim-kechak", label: "Clothes", icon: "👕" },
                    { key: "Poyabzal", label: "Shoes", icon: "👟" },
                    { key: "Sumkalar", label: "Bags", icon: "👜" },
                    { key: "Kompyuter & Noutbuk", label: "Electronics", icon: "📱" },
                    { key: "Soatlar & Zargarlik", label: "Watch", icon: "⌚" },
                    { key: "Go'zallik & Parfyumeriya", label: "Jewelry", icon: "💍" },
                    { key: "Uy va ofis", label: "Kitchen", icon: "🍳" },
                    { key: "O'yinlar & Hobby", label: "Toys", icon: "🎮" },
                  ].map((c) => (
                    <button key={c.key} onClick={() => goCatalog(c.key)}
                      className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="h-14 w-14 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[22px]">
                        {c.icon}
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash Sale section with timer */}
            {productsLoading ? (
              <div className="mx-4 mt-5 overflow-hidden rounded-2xl p-4 space-y-3 bg-neutral-900">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 rounded skeleton" style={{ background: "rgba(255,255,255,0.15)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
                    <div className="h-3 w-48 rounded skeleton" style={{ background: "rgba(255,255,255,0.08)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
                  </div>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="h-8 w-8 rounded-lg skeleton" style={{ background: "rgba(255,255,255,0.15)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />)}
                  </div>
                </div>
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => <SaleCardSkeleton key={i} />)}
                </div>
              </div>
            ) : saleProducts.length > 0 && (
              <div className="mx-4 mt-5 overflow-hidden rounded-2xl bg-neutral-900">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-bold text-white text-[15px]">⚡ Flash Sale</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Bugungi maxsus takliflar</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[pad(saleTimer.h), pad(saleTimer.m), pad(saleTimer.s)].map((v, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="bg-white/20 backdrop-blur-sm text-white font-bold text-[13px] rounded-xl px-2 py-1 min-w-[32px] text-center border border-white/20">
                          {v}
                        </span>
                        {i < 2 && <span className="text-white/80 font-bold text-sm">:</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto pb-4 px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-3" style={{ width: "max-content" }}>
                    {saleProducts.map((product) => (
                      <SaleCard key={product.id} product={product} onAddToCart={addToCart} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Video Catalog button */}
            {products.some((p) => (p.videos?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0) && (
              <div className="mx-3 mt-3">
                <button
                  onClick={() => setVideoCatalogOpen(true)}
                  className="video-catalog-btn flex w-full items-center justify-center gap-2 py-2.5 text-sm font-bold text-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                  </div>
                  Video Katalog
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">YANGI</span>
                </button>
              </div>
            )}

            {/* Most Popular — Evira style */}
            <div className="mt-5 px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[16px] text-neutral-900">Most Popular</h2>
                <button className="text-[13px] text-neutral-400 font-medium">See All</button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {([
                  { key: "recommended", label: "All" },
                  { key: "sale", label: "Chegirma" },
                  { key: "top", label: "Top" },
                ] as { key: Tab; label: string }[]).map((c) => (
                  <button key={c.key} onClick={() => setTab(c.key)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      tab === c.key
                        ? "bg-black text-white"
                        : "bg-[#F5F5F5] text-neutral-600"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recently Viewed */}
            <RecentlyViewed products={recentProducts} />

            {/* Interleaved feed */}
            {productsLoading ? (
              <div className="mt-3 px-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              feedBlocks.map((block, bi) =>
                block.type === "promo" ? (
                  <PromoSection key={block.section.id} section={block.section} products={block.sectionProducts}
                    onAddToCart={addToCart} inWishlist={inWishlist} onToggleWishlist={toggleWishlist} />
                ) : (
                  <div key={`chunk-${bi}`} className="mt-3 px-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {block.items.map((product) => (
                        <ProductCard key={product.id} product={product}
                          onAddToCart={addToCart} inWishlist={inWishlist(product.id)}
                          onToggleWishlist={(p) => toggleWishlist(p.id)} />
                      ))}
                    </div>
                  </div>
                )
              )
            )}
            {!productsLoading && displayed.length === 0 && (
              <div className="mx-3 mt-3 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center">
                <Search className="mb-3 h-10 w-10 text-neutral-300" />
                <p className="font-semibold text-neutral-500">{t("not_found_product")}</p>
              </div>
            )}

            {/* Footer */}
            <footer className="mt-8 border-t border-neutral-200 bg-white px-4 py-8">
              <div className="flex items-center gap-2 mb-3">
                <HammaBopLogo size={28} />
                <span className="font-extrabold text-lg"><span className="text-[#111111]">Hamma</span>Bop</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">{t("footer_about")}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold mb-2">{t("for_buyers")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><button onClick={goHome} className="hover:text-[#111111]">{t("home")}</button></li>
                    <li><button onClick={() => void showOrders()} className="hover:text-[#111111]">{t("my_orders")}</button></li>
                    <li><button onClick={() => setCartOpen(true)} className="hover:text-[#111111]">{t("my_cart")}</button></li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-2">{t("help")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><a href="tel:+998901234567" className="hover:text-[#111111]">+998 90 123 45 67</a></li>
                    <li><a href="https://t.me/HammaBopSupport" target="_blank" rel="noopener noreferrer" className="hover:text-[#111111]">Telegram</a></li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-neutral-400">
                <Link to="/privacy" className="hover:text-[#111111] underline underline-offset-2">
                  Maxfiylik Siyosati
                </Link>
                <span>·</span>
                <Link to="/terms" className="hover:text-[#111111] underline underline-offset-2">
                  Foydalanish shartlari
                </Link>
              </div>
              <p className="mt-2 text-center text-xs text-neutral-400">
                © HammaBop {new Date().getFullYear()}. {t("rights_reserved")}
              </p>
            </footer>
          </>
        ) : activeSection === "catalog" ? (
          <CatalogSection
            products={products}
            loading={productsLoading}
            category={catalogCategory}
            onCategoryChange={setCatalogCategory}
            onAddToCart={addToCart}
            inWishlist={inWishlist}
            onToggleWishlist={toggleWishlist}
            formatPrice={(n) => n.toLocaleString("uz-UZ") + " so'm"}
          />
        ) : activeSection === "orders" ? (
          <div className="mx-auto max-w-7xl px-3 py-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold">{t("my_orders")}</h1>
              <div className="flex flex-wrap items-center gap-3">
                {tgConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Telegram ulangan
                  </span>
                ) : (
                  <Button variant="outline" className="rounded-full border-blue-200 text-[#111111]"
                    onClick={() => void openTelegramLink("connect")}
                    disabled={telegramLinkLoading === "connect"}>
                    {telegramLinkLoading === "connect"
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <MessageCircle className="h-4 w-4" />}
                    Telegram ulash
                  </Button>
                )}
                <Button className="rounded-full bg-[#111111] text-white hover:bg-[#000000]" onClick={goHome}>
                  {t("continue_shopping")}
                </Button>
              </div>
            </div>
            <OrdersList orders={orders} loading={ordersLoading} telegramLinkLoading={telegramLinkLoading}
              isTelegramConnected={tgConnected}
              onTelegramLink={openTelegramLink} onScrollToCatalog={goHome} />
          </div>
        ) : (
          <div className="mx-auto max-w-lg px-3 py-6 space-y-4">
            <h1 className="text-2xl font-bold">Hamyon & Bonuslar</h1>
            <WalletCard
              cashbackBalance={cashbackBalance}
              walletBalance={walletBalance}
              referralCode={referralCode}
              onGetReferral={ensureReferralCode}
              transactions={walletTxs}
            />
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
              <h2 className="font-bold text-neutral-800">Cashback qanday ishlaydi?</h2>
              <div className="space-y-2 text-sm text-neutral-600">
                <p>🎁 Har bir mahsulot xarididan cashback yig'iladi</p>
                <p>💳 Cashback keyingi xaridlarda ishlatiladi</p>
                <p>👥 Do'stingizni taklif qiling va 10 000 so'm bonus oling</p>
                <p>🔗 Referal havolangizdan foydalangan har bir do'sting uchun bonus!</p>
              </div>
            </div>
            <Button onClick={goHome} className="w-full rounded-full bg-[#111111] text-white hover:bg-[#000000]">
              Xaridga o'tish
            </Button>
          </div>
        )}
      </main>

      {/* ── WISHLIST SHEET ── */}
      {wishlistOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setWishlistOpen(false)} />
          <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" fill="currentColor" />
                <span className="text-lg font-bold">Sevimlilar ({wishlistIds.length})</span>
              </div>
              <button onClick={() => setWishlistOpen(false)} className="rounded-full p-1.5 hover:bg-neutral-100 text-neutral-500 font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {wishlistIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Heart className="mb-3 h-12 w-12 text-neutral-200" />
                  <p className="font-semibold text-neutral-500">Hali sevimli mahsulot yo'q</p>
                  <button onClick={() => setWishlistOpen(false)} className="mt-3 text-sm font-semibold text-[#111111]">Mahsulotlarni ko'rish</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.filter((p) => wishlistIds.includes(p.id)).map((product) => (
                    <div key={product.id} className="relative rounded-xl border border-neutral-100 bg-white p-2 shadow-sm">
                      <button onClick={() => toggleWishlist(product.id)} className="absolute right-2 top-2 rounded-full bg-white/80 p-1">
                        <Heart className="h-4 w-4 text-red-500" fill="currentColor" />
                      </button>
                      <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-neutral-50">
                        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain" />}
                      </div>
                      <p className="line-clamp-2 text-xs font-medium text-neutral-800">{product.name}</p>
                      <p className="mt-1 text-sm font-bold text-[#111111]">{formatPrice(Number(product.price))}</p>
                      <button onClick={() => { addToCart(product); setWishlistOpen(false); }}
                        className="mt-2 w-full rounded-lg bg-[#111111] py-1.5 text-xs font-semibold text-white">Savatga</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── VIDEO CATALOG ── */}
      {videoCatalogOpen && (
        <VideoCatalog
          products={products}
          onClose={() => setVideoCatalogOpen(false)}
          onAddToCart={addToCart}
          inWishlist={inWishlist}
          onToggleWishlist={(id) => {
            const p = products.find((pr) => pr.id === id);
            if (p) toggleWishlist(p.id);
          }}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNav
        active={activeSection === "home" ? "home" : activeSection === "catalog" ? "catalog" : activeSection === "orders" ? "orders" : "home"}
        cartCount={cartCount > 0 ? cartCount : undefined}
      />

      {/* Modals */}
      <CartSheet
        open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} cartTotal={cartTotal}
        onUpdateQuantity={updateQuantity} onRemove={removeFromCart}
        onCheckout={openCheckout} onGoToCatalog={goHome}
        recommended={products.filter((p) => p.is_recommended)}
        onAddToCart={addToCart} isLoggedIn={!!user}
        onLogin={() => navigate("/login")}
      />
      <ProfileDialog
        open={profileOpen} onOpenChange={setProfileOpen}
        form={form} onFormChange={setForm}
        saving={saving} onSave={() => void save()}
      />
      <CheckoutDialog
        open={checkoutOpen} onOpenChange={setCheckoutOpen}
        cart={cart} cartTotal={cartTotal}
        form={form} onFormChange={setForm}
        placing={placingOrder}
        onPlace={(opts) => void placeOrder(opts)}
        deliveryFee={checkoutDeliveryFee}
        cashbackBalance={cashbackBalance}
        walletBalance={walletBalance}
      />

      {successOrderId && (
        <OrderSuccess
          orderId={successOrderId}
          onClose={() => { setSuccessOrderId(null); setActiveSection("orders"); }}
        />
      )}
    </div>
    </PullToRefresh>
  );
};

// ── SALE CARD (for flash sale horizontal scroll) ──
type ExtendedProduct = Product & {
  discount_percent?: number;
  original_price?: number;
  warranty?: string;
};

function SaleCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product) => void }) {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const { cart } = useCart();
  const ep = product as ExtendedProduct;
  const discountPct = ep.discount_percent;
  const origPrice = ep.original_price;
  const img = product.images?.[0] ?? null;
  const qty = cart.find(i => i.id === product.id)?.qty ?? 0;

  return (
    <div
      className="w-[140px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        {img ? (
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-neutral-200" />
          </div>
        )}
        {discountPct && (
          <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{discountPct}%
          </span>
        )}
        {qty > 0 && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] text-[10px] font-bold text-white">
            {qty}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[13px] font-extrabold text-neutral-900">{format(Number(product.price))}</p>
        {origPrice && origPrice > Number(product.price) && (
          <p className="text-[10px] text-neutral-400 line-through">{format(origPrice)}</p>
        )}
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-600">{product.name}</p>
        <div className="mt-2">
          <AddToCartButton product={product} onAddToCart={onAddToCart} size="sm" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CATALOG SECTION
// ─────────────────────────────────────────────
const CATEGORIES = [
  "Mobil telefonlar", "Kompyuter & Noutbuk", "Kiyim-kechak", "Poyabzal",
  "Uy va ofis", "Avtomobil", "Bolalar tovarlari", "O'yinlar & Hobby",
  "Sport & Sog'liq", "Soatlar & Zargarlik", "Sumkalar", "Asbob-uskuna",
  "Go'zallik & Parfyumeriya", "Kameralar va xavfsizlik",
];

type CatalogProps = {
  products: Product[];
  loading: boolean;
  category: string;
  onCategoryChange: (c: string) => void;
  onAddToCart: (p: Product) => void;
  inWishlist: (id: string) => boolean;
  onToggleWishlist: (id: string) => void;
  formatPrice: (n: number) => string;
};

function CatalogCard({ product, onAddToCart, inWishlist, onToggleWishlist }: {
  product: Product;
  onAddToCart: (p: Product) => void;
  inWishlist: boolean;
  onToggleWishlist: () => void;
}) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();
  const { cart } = useCart();

  const img = product.images?.[0] ?? null;
  const outOfStock = product.stock_count === 0;
  const inCart = cart.some(item => item.id === product.id);
  const cartQty = cart.find(item => item.id === product.id)?.qty ?? 0;
  const ep = product as ExtendedProduct;
  const discountPct = ep.discount_percent;
  const origPrice = ep.original_price;
  const warranty = ep.warranty;
  const sold = product.sold_count;
  const rating = sold > 0 ? (4.1 + (product.id.charCodeAt(0) % 9) / 10).toFixed(1) : null;

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition active:scale-[0.98]"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative overflow-hidden bg-[#f5f5f5]" style={{ aspectRatio: "1/1" }}>
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "opacity-60" : ""}`}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-neutral-200" />
          </div>
        )}
        {discountPct && !outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-xl bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            -{discountPct}%
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-2xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white">Tugadi</span>
          </div>
        )}
        {inCart && !outOfStock && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <CheckCircle2 className="h-3 w-3" /> {cartQty} ta
          </div>
        )}
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110"
          onClick={e => { e.stopPropagation(); onToggleWishlist(); toast.success(inWishlist ? "Sevimlilardan olib tashlandi" : "Sevimlilariga qo'shildi"); }}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? "fill-red-500 text-red-500" : "text-neutral-400"}`} />
        </button>
      </div>

      <div className="px-3 py-2.5">
        {warranty && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
            <ShieldCheck className="h-3 w-3" /> Kafolat {warranty}
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <p className="text-[17px] font-extrabold leading-tight text-neutral-900">
            {formatPrice(Number(product.price))}
          </p>
        </div>
        {origPrice && origPrice > Number(product.price) && (
          <p className="text-xs text-neutral-400 line-through">{formatPrice(origPrice)}</p>
        )}
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-neutral-700">
          {product.name}
        </p>
        {rating && sold > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[12px] font-semibold text-neutral-700">{rating}</span>
            <span className="text-[11px] text-neutral-400">
              ({sold > 999 ? (sold / 1000).toFixed(1) + "k" : sold})
            </span>
          </div>
        )}
        <div className="mt-2.5">
          <AddToCartButton product={product} onAddToCart={onAddToCart} size="md" />
        </div>
      </div>
    </article>
  );
}

function CatalogSection({ products, loading, category, onCategoryChange, onAddToCart, inWishlist, onToggleWishlist }: CatalogProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    let list = products.filter(p => p.status === "active");
    if (category) list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    return list;
  }, [products, category, search]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-white px-3 pt-3 pb-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["", ...CATEGORIES].map(cat => (
            <button
              key={cat || "all"}
              onClick={() => onCategoryChange(cat)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                category === cat
                  ? "border-black bg-black text-white"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              {cat || "Barchasi"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 text-xs text-neutral-400 font-medium">
        {loading ? "" : `${filtered.length} ta mahsulot`}
        {category && <span className="ml-1 text-[#111111]">· {category}</span>}
      </div>

      <div className="px-3 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white">
                <div className="aspect-square animate-pulse bg-neutral-100" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map(product => (
              <CatalogCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                inWishlist={inWishlist(product.id)}
                onToggleWishlist={() => onToggleWishlist(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-neutral-300" />
            <p className="font-semibold text-neutral-500">Mahsulot topilmadi</p>
            <button onClick={() => { setSearch(""); onCategoryChange(""); }}
              className="mt-2 text-sm font-semibold text-[#111111]">Filterni tozalash</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Index;
