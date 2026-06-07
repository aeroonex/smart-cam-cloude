import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, Heart, Home, LayoutDashboard, Loader2,
  LogOut, MapPin, MessageCircle, Package, Play, Search, ShieldCheck, ShoppingCart, Sparkles, Star, UserRound, Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { HeroBanner } from "@/components/HeroBanner";
import { OrdersList } from "@/components/OrdersList";
import { ProductCard } from "@/components/ProductCard";
import { ProfileDialog } from "@/components/ProfileDialog";
import { PromoSection } from "@/components/PromoSection";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { VideoCatalog } from "@/components/VideoCatalog";
import { WalletCard } from "@/components/WalletCard";
import { DarkModeToggle } from "@/components/DarkModeToggle";
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
import { AITryOn } from "@/components/AITryOn";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/format";
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
  { key: "Kiyim-kechak", label: "Kiyim-kechak", emoji: "👕" },
  { key: "Mobil telefonlar", label: "Telefonlar", emoji: "📱" },
  { key: "Sport & Sog'liq", label: "Sport", emoji: "⚽" },
  { key: "Bolalar tovarlari", label: "Bolalar", emoji: "🧸" },
  { key: "Kompyuter & Noutbuk", label: "Kompyuter", emoji: "💻" },
  { key: "Uy va ofis", label: "Uy & Ofis", emoji: "🏠" },
  { key: "Go'zallik & Parfyumeriya", label: "Go'zallik", emoji: "💄" },
  { key: "Avtomobil", label: "Avto", emoji: "🚗" },
  { key: "Soatlar & Zargarlik", label: "Soatlar", emoji: "⌚" },
  { key: "O'yinlar & Hobby", label: "O'yinlar", emoji: "🎮" },
];

const Index = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, user, signOut } = useSessionContext();
  const { products, loading: productsLoading } = useProducts();
  const { cart, cartCount, cartTotal, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(user);
  const { profile, form, setForm, saving, profileOpen, setProfileOpen, save, upsertForOrder } = useProfile(user);
  const { currency, setCurrency, format: formatPrice } = useCurrency();
  const { t, lang, setLang } = useI18n();
  const { wishlistIds, toggleWishlist, inWishlist } = useWishlist(user);
  const { viewedIds, track: trackViewed } = useRecentlyViewed(user);
  const { walletBalance, cashbackBalance, referralCode, ensureReferralCode } = useWallet(user);
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
  const [activeSection, setActiveSection] = useState<ActiveSection>("home");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("recommended");
  const [searchInput, setSearchInput] = useState("");
  const [videoCatalogOpen, setVideoCatalogOpen] = useState(false);
  const [aiTryOnOpen, setAiTryOnOpen] = useState(false);
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

      // Cashback va promo — buyurtmadan keyin, xato bo'lsa bloklash shart emas
      const totalCashback = cart.reduce((sum, item) => {
        const p = products.find((pr) => pr.id === item.id);
        return sum + (p?.cashback_amount ?? 0) * item.qty;
      }, 0);
      if (totalCashback > 0) {
        const { error: cbErr } = await supabase
          .from("users")
          .update({ cashback_balance: cashbackBalance + totalCashback })
          .eq("id", user.id);
        if (cbErr) console.error("[cashback update]", cbErr);
        else toast.success(`${totalCashback.toLocaleString()} so'm cashback yig'ildi!`);
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
    <div className="min-h-screen bg-[#f0f4fa] pb-28">

      {/* ── TOP BAR (Uzum style) ── */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-[1280px]">

          {/* Row 1: Location + icons */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[15px] font-bold text-neutral-900">
                  <MapPin className="h-4 w-4 text-[#1d4f8a]" />
                  {region.replace(" shahri", "").replace(" viloyati", "")}
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto rounded-xl z-50">
                {regions.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => chooseRegion(r)}
                    className={`rounded-lg text-sm ${region === r ? "font-semibold text-[#1d4f8a]" : ""}`}>{r}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <DarkModeToggle />

              {/* Lang pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-600">{lang.toUpperCase()}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl z-50">
                  {LANGS.map((l) => (
                    <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}
                      className={`rounded-lg text-sm ${lang === l.code ? "font-semibold text-[#1d4f8a]" : ""}`}>{l.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button onClick={() => navigate("/wishlist")} className="relative p-1">
                <Heart className={`h-6 w-6 ${wishlistIds.length > 0 ? "fill-red-500 text-red-500" : "text-neutral-700"}`} />
                {wishlistIds.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {wishlistIds.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Search bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 bg-[#f5f5f5]">
              <Search className="ml-3 h-4 w-4 shrink-0 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
                placeholder={t("search_placeholder")}
                className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm outline-none"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="px-2 text-neutral-400 font-bold">✕</button>
              )}
              <button onClick={doSearch} className="bg-[#1d4f8a] px-4 py-2.5 text-sm font-semibold text-white">
                {t("search_btn")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-[1280px]">
        {activeSection === "home" ? (
          <>
            {/* Wallet/cashback banner */}
            {user && (walletBalance + cashbackBalance) > 0 && !walletBannerHidden && (
              <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-[#e8f0fb] border border-[#b8d0f0] px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d4f8a] flex-shrink-0">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px]">
                    {(walletBalance + cashbackBalance).toLocaleString()} so'm
                  </p>
                  <p className="text-xs text-neutral-500">hamyoningizdagi bonus mablag'</p>
                </div>
                <button onClick={() => setWalletBannerHidden(true)} className="p-1 text-neutral-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            )}

            {/* Hero Banner */}
            <div className="mx-3 mt-3 overflow-hidden rounded-2xl">
              <HeroBanner />
            </div>

            {/* Category icons — mobile: 2-row scroll | desktop: wrap to fill */}
            {(() => {
              const catBtn = (key: string, label: string, emoji: string) => (
                <button key={key || "all"} onClick={() => goCatalog(key)}
                  className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
                  <div className="h-[52px] w-[52px] rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center text-[22px]">
                    {emoji}
                  </div>
                  <span className="text-[10px] font-medium text-neutral-600 text-center leading-tight w-full">{label}</span>
                </button>
              );
              const aiBtn = (
                <button key="__ai__" onClick={() => setAiTryOnOpen(true)}
                  className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
                  <div className="h-[52px] w-[52px] rounded-full flex items-center justify-center shadow-md"
                    style={{ background: "linear-gradient(145deg, #6d28d9, #8b5cf6, #7c3aed)" }}>
                    <span className="text-[15px] font-extrabold text-white tracking-tight">AI</span>
                  </div>
                  <span className="text-[10px] font-semibold text-violet-600 text-center leading-tight w-full">OnexAI</span>
                </button>
              );
              const allItems = [
                catBtn(CATEGORY_ICONS[0].key, CATEGORY_ICONS[0].label, CATEGORY_ICONS[0].emoji),
                aiBtn,
                ...CATEGORY_ICONS.slice(1).map(c => catBtn(c.key, c.label, c.emoji)),
                catBtn("", "Barchasi", "🗂️"),
              ];
              return (
                <>
                  {/* Mobile: 2-row horizontal scroll */}
                  <div className="mt-3 overflow-x-auto px-3 sm:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    <div className="grid gap-x-2 gap-y-2 pb-1" style={{
                      gridTemplateRows: "repeat(2, auto)",
                      gridAutoFlow: "column",
                      gridAutoColumns: "68px",
                      width: "max-content",
                    }}>
                      {allItems}
                    </div>
                  </div>
                  {/* Desktop: spread across full width */}
                  <div className="mt-3 hidden sm:flex flex-wrap justify-around gap-y-3 px-3 pb-1">
                    {allItems}
                  </div>
                </>
              );
            })()}

            {/* Flash Sale section with timer */}
            {productsLoading ? (
              <div className="mx-3 mt-4 overflow-hidden rounded-2xl p-4 space-y-3" style={{ background: "linear-gradient(135deg, #0d2744 0%, #1d4f8a 60%, #2860a8 100%)" }}>
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
              <div className="mx-3 mt-4 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0d2744 0%, #1d4f8a 60%, #2860a8 100%)" }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-bold text-white text-[15px]">Yozgi chegirmalar</p>
                    <p className="text-[11px] text-white/50 mt-0.5">haftaning barcha foydali takliflari</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[pad(saleTimer.h), pad(saleTimer.m), pad(saleTimer.s)].map((v, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="bg-white text-neutral-900 font-bold text-[13px] rounded-lg px-2 py-1 min-w-[32px] text-center">
                          {v}
                        </span>
                        {i < 2 && <span className="text-white font-bold text-sm">:</span>}
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

            {/* Filter tabs */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto px-3 pb-0.5" style={{ scrollbarWidth: "none" }}>
              {([
                { key: "recommended", label: "Tavsiya etilgan" },
                { key: "sale", label: "Chegirmali" },
                { key: "top", label: "Top mahsulotlar" },
              ] as { key: Tab; label: string }[]).map((c) => (
                <button key={c.key} onClick={() => setTab(c.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    tab === c.key ? "bg-[#1d4f8a] text-white" : "bg-white text-neutral-600 border border-neutral-200"
                  }`}>
                  {c.label}
                </button>
              ))}
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
                  <div key={`chunk-${bi}`} className="mt-3 px-3">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                <span className="font-extrabold text-lg"><span className="text-[#1d4f8a]">Hamma</span>Bop</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">{t("footer_about")}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold mb-2">{t("for_buyers")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><button onClick={goHome} className="hover:text-[#1d4f8a]">{t("home")}</button></li>
                    <li><button onClick={() => void showOrders()} className="hover:text-[#1d4f8a]">{t("my_orders")}</button></li>
                    <li><button onClick={() => setCartOpen(true)} className="hover:text-[#1d4f8a]">{t("my_cart")}</button></li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-2">{t("help")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><a href="tel:+998901234567" className="hover:text-[#1d4f8a]">+998 90 123 45 67</a></li>
                    <li><a href="https://t.me/HammaBopSupport" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d4f8a]">Telegram</a></li>
                  </ul>
                </div>
              </div>
              <p className="mt-6 text-center text-xs text-neutral-400">
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
                  <Button variant="outline" className="rounded-full border-blue-200 text-[#1d4f8a]"
                    onClick={() => void openTelegramLink("connect")}
                    disabled={telegramLinkLoading === "connect"}>
                    {telegramLinkLoading === "connect"
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <MessageCircle className="h-4 w-4" />}
                    Telegram ulash
                  </Button>
                )}
                <Button className="rounded-full bg-[#1d4f8a] text-white hover:bg-[#164078]" onClick={goHome}>
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
            <Button onClick={goHome} className="w-full rounded-full bg-[#1d4f8a] text-white hover:bg-[#164078]">
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
                  <button onClick={() => setWishlistOpen(false)} className="mt-3 text-sm font-semibold text-[#1d4f8a]">Mahsulotlarni ko'rish</button>
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
                      <p className="mt-1 text-sm font-bold text-[#1d4f8a]">{formatPrice(Number(product.price))}</p>
                      <button onClick={() => { addToCart(product); setWishlistOpen(false); }}
                        className="mt-2 w-full rounded-lg bg-[#1d4f8a] py-1.5 text-xs font-semibold text-white">Savatga</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI TRY-ON ── */}
      {aiTryOnOpen && (
        <AITryOn
          products={products}
          onClose={() => setAiTryOnOpen(false)}
        />
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

      {/* ── BOTTOM NAV — Liquid Glass (Flutter-style bubble) ── */}
      <nav className="fixed bottom-4 left-0 right-0 z-[200] px-5 pointer-events-none">
        <div className="mx-auto max-w-sm pointer-events-auto">
          <div
            className="flex items-center justify-around rounded-[36px] px-1 py-1.5"
            style={{
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",
              border: "1.5px solid rgba(255,255,255,0.75)",
              boxShadow: "0 4px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.04) inset",
            }}
          >
            {/* Bosh sahifa — Orange */}
            <LiquidBtn active={activeSection === "home"} label="Bosh sahifa"
              color="#FF6B35" bubbleBg="rgba(255,107,53,0.14)" onClick={goHome}>
              <Home className="h-[21px] w-[21px]" strokeWidth={activeSection === "home" ? 2.2 : 1.8} />
            </LiquidBtn>

            {/* Katalog — Blue */}
            <LiquidBtn active={activeSection === "catalog"} label="Katalog"
              color="#3B82F6" bubbleBg="rgba(59,130,246,0.14)" onClick={() => goCatalog()}>
              <svg className="h-[21px] w-[21px]" fill="none" stroke="currentColor"
                strokeWidth={activeSection === "catalog" ? 2.2 : 1.8} viewBox="0 0 24 24">
                <rect x="3" y="3" width="8" height="8" rx="1.5" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" />
              </svg>
            </LiquidBtn>

            {/* Savat — Amber */}
            <LiquidBtn active={false} label="Savat"
              color="#F59E0B" bubbleBg="rgba(245,158,11,0.14)" onClick={() => navigate("/cart")}
              badge={cartCount > 0 ? cartCount : undefined}>
              <ShoppingCart className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </LiquidBtn>

            {/* Buyurtmalar — Teal */}
            <LiquidBtn active={activeSection === "orders"} label="Buyurtmalar"
              color="#10B981" bubbleBg="rgba(16,185,129,0.14)" onClick={() => navigate("/orders")}>
              <Package className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </LiquidBtn>

            {/* Profil — Purple */}
            {sessionLoading ? (
              <div className="flex flex-col items-center gap-0.5 w-[56px] py-2">
                <Loader2 className="h-[21px] w-[21px] animate-spin text-neutral-300" />
                <span className="text-[9px] text-neutral-300">Profil</span>
              </div>
            ) : user ? (
              <LiquidBtn active={false} label="Kabinet"
                color="#8B5CF6" bubbleBg="rgba(139,92,246,0.14)" onClick={() => navigate("/profile")}>
                <Avatar className="h-[21px] w-[21px]">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-violet-400 text-[7px] font-bold text-white">
                    {getInitials(profile?.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
              </LiquidBtn>
            ) : (
              <LiquidBtn active={false} label="Kabinet"
                color="#8B5CF6" bubbleBg="rgba(139,92,246,0.14)" onClick={() => navigate("/profile")}>
                <UserRound className="h-[21px] w-[21px]" strokeWidth={1.8} />
              </LiquidBtn>
            )}
          </div>
        </div>
      </nav>

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
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d4f8a] text-[10px] font-bold text-white">
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
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-[#1d4f8a] px-2 py-0.5 text-[10px] font-bold text-white shadow">
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
                  ? "border-[#1d4f8a] bg-[#1d4f8a] text-white"
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
        {category && <span className="ml-1 text-[#1d4f8a]">· {category}</span>}
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
              className="mt-2 text-sm font-semibold text-[#1d4f8a]">Filterni tozalash</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ active, label, onClick, children }: {
  active: boolean; label: string; onClick: () => void; children: React.ReactNode;
}) {
  return <LiquidBtn active={active} label={label} color="#EE7526" bubbleBg="rgba(238,117,38,0.13)" onClick={onClick}>{children}</LiquidBtn>;
}

function LiquidBtn({ active, label, color, bubbleBg, onClick, children, badge }: {
  active: boolean; label: string; color: string; bubbleBg: string;
  onClick: () => void; children: React.ReactNode; badge?: number;
}) {
  function handleClick() {
    // Haptic feedback
    try { if ("vibrate" in navigator) navigator.vibrate(active ? 6 : 10); } catch {}
    onClick();
  }
  return (
    <button
      onClick={handleClick}
      className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] py-2 select-none"
      style={{
        color: active ? color : "#8e8e93",
        transition: "color 0.3s ease",
      }}
    >
      {/* Liquid bubble background */}
      <span
        className="absolute inset-0 rounded-[20px]"
        style={{
          background: bubbleBg,
          transform: active ? "scale(1)" : "scale(0)",
          opacity: active ? 1 : 0,
          transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
          transformOrigin: "center bottom",
        }}
      />
      {/* Shine on bubble */}
      {active && (
        <span
          className="absolute left-2 top-1.5 h-[6px] rounded-full pointer-events-none"
          style={{
            width: "40%",
            background: "rgba(255,255,255,0.55)",
            filter: "blur(1px)",
          }}
        />
      )}
      {/* Icon */}
      <span
        className="relative z-10"
        style={{
          transform: active ? "scale(1.12) translateY(-1px)" : "scale(1)",
          transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {children}
      </span>
      {/* Label */}
      <span
        className="relative z-10 text-[9px] font-semibold leading-none"
        style={{
          opacity: active ? 1 : 0.7,
          transition: "opacity 0.3s ease",
        }}
      >
        {label}
      </span>
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none z-20 shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
}

export default Index;
