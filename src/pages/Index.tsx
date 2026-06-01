import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, Flame, Heart, Home, LayoutDashboard, Loader2,
  LogOut, MapPin, MessageCircle, Package, Play, Search, ShieldCheck, ShoppingCart, Star, UserRound,
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
import { useSessionContext } from "@/components/session-context-provider";
import { useCart } from "@/hooks/useCart";
import { useCurrency, type Currency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import { useWishlist } from "@/hooks/useWishlist";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useWallet } from "@/hooks/useWallet";
import type { Lang } from "@/lib/i18n";
import { regions } from "@/constants";
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

const Index = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, user, signOut } = useSessionContext();
  const { products, loading: productsLoading } = useProducts();
  const { cart, cartCount, cartTotal, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(user);
  const { profile, form, setForm, saving, profileOpen, setProfileOpen, save, upsertForOrder } = useProfile(user);
  const { currency, setCurrency } = useCurrency();
  const { t, lang, setLang } = useI18n();
  const { wishlistIds, toggleWishlist, inWishlist } = useWishlist();
  const { viewedIds, track: trackViewed } = useRecentlyViewed(user);
  const { walletBalance, cashbackBalance, referralCode, ensureReferralCode } = useWallet(user);

  const [region, setRegion] = useState<string>(() => localStorage.getItem("hammabop_region") ?? "Toshkent shahri");
  const chooseRegion = (r: string) => { setRegion(r); localStorage.setItem("hammabop_region", r); };
  const CURRENCIES: Currency[] = ["UZS", "USD", "RUB"];
  const LANGS: { code: Lang; label: string }[] = [{ code: "uz", label: "UZ" }, { code: "ru", label: "RU" }];

  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("home");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [tab, setTab] = useState<Tab>("recommended");
  const [searchInput, setSearchInput] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [videoCatalogOpen, setVideoCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

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

  const recentProducts = useMemo(() =>
    viewedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => !!p)
      .slice(0, 12),
    [viewedIds, products]);

  const goHome = () => { setActiveSection("home"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goCatalog = (cat = "") => { setActiveSection("catalog"); setCatalogCategory(cat); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const showOrders = async () => {
    if (!user) { navigate("/login"); return; }
    setActiveSection("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await reloadOrders();
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
    discountAmount: number; deliveryFee: number; addressDetail?: string;
  }) => {
    if (!user) { navigate("/login"); return; }
    if (!cart.length) { toast.error("Savat hozircha bo'sh."); return; }
    if (!form.full_name || !form.phone || !form.region) {
      toast.error("Buyurtma uchun ism, telefon va hududni kiriting."); return;
    }
    setPlacingOrder(true);
    const profileOk = await upsertForOrder(user);
    if (!profileOk) { setPlacingOrder(false); return; }

    const orderItems: OrderItem[] = cart.map((item) => ({
      product_id: item.id, product_name: item.name, price: item.price, quantity: item.qty,
    }));

    const finalTotal = Math.max(0, cartTotal - opts.discountAmount) + opts.deliveryFee;

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

    setPlacingOrder(false);
    if (error) { toast.error("Buyurtma yuborilmadi. Iltimos, qayta urinib ko'ring."); return; }

    // Apply cashback if any product has cashback
    const totalCashback = cart.reduce((sum, item) => {
      const p = products.find((pr) => pr.id === item.id);
      return sum + (p?.cashback_amount ?? 0) * item.qty;
    }, 0);
    if (totalCashback > 0 && user) {
      await supabase.from("users").update({ cashback_balance: cashbackBalance + totalCashback }).eq("id", user.id);
    }

    // Increment promo code uses
    if (opts.promoCode) {
      const { data: promo } = await supabase.from("promo_codes").select("uses_count").eq("code", opts.promoCode).single();
      if (promo) {
        await supabase.from("promo_codes").update({ uses_count: promo.uses_count + 1 }).eq("code", opts.promoCode);
      }
    }

    clearCart(); setCheckoutOpen(false);
    setForm((prev) => ({ ...prev, notes: "" }));
    toast.success(`Buyurtma qabul qilindi: #${order.id.slice(0, 8).toUpperCase()}`);
    if (totalCashback > 0) toast.success(`🎁 ${totalCashback.toLocaleString()} so'm cashback yig'ildi!`);
    setActiveSection("orders");
    await reloadOrders();
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

  // Delivery fee for checkout (max from cart items)
  const checkoutDeliveryFee = cart.reduce((max, item) => {
    const p = products.find((pr) => pr.id === item.id);
    if (!p || p.delivery_free) return max;
    return Math.max(max, p.delivery_fee ?? 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-[1280px]">
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <button onClick={goHome} className="flex items-center gap-2">
            <HammaBopLogo size={32} />
            <span className="font-extrabold text-[17px] leading-none tracking-tight">
              <span className="text-[#C85A10]">Hamma</span><span className="text-neutral-900">Bop</span>
            </span>
          </button>

          {/* Combined pill: Region | Lang | Currency */}
          <div className="flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 gap-1.5 text-[12px] font-medium text-neutral-700 shadow-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3 text-[#EE7526]" />
                  <span>{region.replace(" shahri","").replace(" viloyati","")}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto rounded-xl z-50">
                {regions.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => chooseRegion(r)}
                    className={`rounded-lg text-sm ${region === r ? "font-semibold text-[#EE7526]" : ""}`}>{r}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-neutral-300">|</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>{lang.toUpperCase()}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl z-50">
                {LANGS.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}
                    className={`rounded-lg text-sm ${lang === l.code ? "font-semibold text-[#EE7526]" : ""}`}>{l.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-neutral-300">|</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>{currency === "UZS" ? "So'm" : currency === "USD" ? "USD" : "RUB"}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl z-50">
                {CURRENCIES.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => setCurrency(c)}
                    className={`rounded-lg text-sm ${currency === c ? "font-semibold text-[#EE7526]" : ""}`}>
                    {c === "UZS" ? "So'm" : c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-2.5">
          <div ref={catalogRef} className="relative shrink-0">
            <button onClick={() => setCatalogOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-sm font-medium text-neutral-700">
              Katalog <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
            </button>
            <CategoryMenu open={catalogOpen} onClose={() => setCatalogOpen(false)} />
          </div>

          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            <Search className="ml-3 h-4 w-4 shrink-0 text-neutral-400" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              placeholder={t("search_placeholder")}
              className="flex-1 min-w-0 bg-transparent px-2 py-2 text-sm outline-none" />
            <button onClick={doSearch} className="bg-[#EE7526] px-4 py-2 text-sm font-semibold text-white">
              {t("search_btn")}
            </button>
          </div>
        </div>
        </div>{/* /max-w */}
      </div>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-[1280px]">
        {activeSection === "home" ? (
          <>
            <HeroBanner />

            {/* Video Catalog button */}
            {products.some((p) => (p.videos?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0) && (
              <div className="mx-3 mt-3">
                <button
                  onClick={() => setVideoCatalogOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 py-3.5 text-sm font-bold text-white shadow hover:from-neutral-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EE7526]">
                    <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                  </div>
                  Video Katalog (Reels uslubida)
                  <span className="rounded-full bg-[#EE7526] px-2 py-0.5 text-[11px]">YANGI</span>
                </button>
              </div>
            )}

            {/* Promo Sections */}
            {promoSections.map((section) => {
              const sectionProducts = products.filter((p) => section.product_ids.includes(p.id));
              return (
                <PromoSection key={section.id} section={section} products={sectionProducts}
                  onAddToCart={addToCart} inWishlist={inWishlist} onToggleWishlist={toggleWishlist} />
              );
            })}

            {/* Recently Viewed */}
            <RecentlyViewed products={recentProducts} />

            {/* Filter tabs — HammaBop uslubi */}
            <div
              className="mt-4 flex items-center gap-2 overflow-x-auto px-3 pb-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {(
                [
                  { key: "recommended", label: "Barchasi" },
                  { key: "sale",        label: "Chegirmali" },
                  { key: "top",         label: "Sport jihozlari" },
                ] as { key: Tab; label: string }[]
              ).map((c) => (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    tab === c.key
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-600 border border-neutral-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Product grid — 3 ustun mobil, katta ekranda ko'proq */}
            <div className="mt-3 px-3">
              {productsLoading ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              ) : displayed.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {displayed.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      inWishlist={inWishlist(product.id)}
                      onToggleWishlist={(p) => toggleWishlist(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center">
                  <Search className="mb-3 h-10 w-10 text-neutral-300" />
                  <p className="font-semibold text-neutral-500">{t("not_found_product")}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="mt-8 border-t border-neutral-200 bg-white px-4 py-8">
              <div className="flex items-center gap-2 mb-3">
                <HammaBopLogo size={28} />
                <span className="font-extrabold text-lg"><span className="text-[#EE7526]">Hamma</span>Bop</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">{t("footer_about")}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold mb-2">{t("for_buyers")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><button onClick={goHome} className="hover:text-[#EE7526]">{t("home")}</button></li>
                    <li><button onClick={() => void showOrders()} className="hover:text-[#EE7526]">{t("my_orders")}</button></li>
                    <li><button onClick={() => setCartOpen(true)} className="hover:text-[#EE7526]">{t("my_cart")}</button></li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-2">{t("help")}</p>
                  <ul className="space-y-1 text-neutral-500">
                    <li><a href="tel:+998901234567" className="hover:text-[#EE7526]">+998 90 123 45 67</a></li>
                    <li><a href="https://t.me/HammaBopSupport" target="_blank" rel="noopener noreferrer" className="hover:text-[#EE7526]">Telegram qo'llab-quvvatlash</a></li>
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
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-full border-orange-200"
                  onClick={() => void openTelegramLink("connect")}
                  disabled={telegramLinkLoading === "connect"}>
                  {telegramLinkLoading === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {t("connect_telegram")}
                </Button>
                <Button className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]" onClick={goHome}>
                  {t("continue_shopping")}
                </Button>
              </div>
            </div>
            <OrdersList orders={orders} loading={ordersLoading} telegramLinkLoading={telegramLinkLoading}
              onTelegramLink={openTelegramLink} onScrollToCatalog={goHome} />
          </div>
        ) : (
          /* Wallet / Referral section */
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
            <Button onClick={goHome} className="w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
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
                  <button onClick={() => setWishlistOpen(false)} className="mt-3 text-sm font-semibold text-[#EE7526]">Mahsulotlarni ko'rish</button>
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
                      <p className="mt-1 text-sm font-bold text-[#EE7526]">{product.price.toLocaleString()} so'm</p>
                      <button onClick={() => { addToCart(product); setWishlistOpen(false); }}
                        className="mt-2 w-full rounded-lg bg-[#EE7526] py-1.5 text-xs font-semibold text-white">Savatga</button>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <button onClick={goHome}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition ${activeSection === "home" ? "text-[#EE7526]" : "text-neutral-500"}`}>
            <Home className="h-6 w-6" />
            <span className="text-[10px] font-medium">{t("home")}</span>
          </button>

          <button onClick={() => goCatalog()}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition ${activeSection === "catalog" ? "text-[#EE7526]" : "text-neutral-500"}`}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" />
            </svg>
            <span className="text-[10px] font-medium">Katalog</span>
          </button>

          <button onClick={() => setCartOpen(true)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition text-neutral-500">
            <ShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute right-1.5 top-0.5 flex h-4.5 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
            <span className="text-[10px] font-medium">{t("cart")}</span>
          </button>

          <button onClick={() => setWishlistOpen(true)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition text-neutral-500">
            <Heart className={`h-6 w-6 ${wishlistIds.length > 0 ? "fill-red-500 text-red-500" : ""}`} />
            {wishlistIds.length > 0 && (
              <span className="absolute right-1.5 top-0.5 flex h-4.5 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {wishlistIds.length}
              </span>
            )}
            <span className="text-[10px] font-medium">Sevimli</span>
          </button>

          {sessionLoading ? (
            <div className="flex flex-col items-center gap-0.5 px-3 py-1.5">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              <span className="text-[10px] font-medium text-neutral-400">Kirish</span>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition text-neutral-500">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-orange-300 text-[10px] font-bold text-white">
                      {getInitials(profile?.full_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium">Kabinet</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56 rounded-2xl border-orange-100 p-2 mb-2">
                <div className="px-3 py-2">
                  <p className="font-bold text-neutral-900">{profile?.full_name || user.email}</p>
                  <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  {(cashbackBalance > 0 || walletBalance > 0) && (
                    <p className="mt-1 text-xs font-semibold text-[#EE7526]">
                      💰 {(cashbackBalance + walletBalance).toLocaleString()} so'm hamyon
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void showOrders()} className="rounded-xl py-2.5">
                  <Package className="mr-2 h-4 w-4" /> {t("my_orders")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveSection("wallet"); window.scrollTo({ top: 0 }); }} className="rounded-xl py-2.5">
                  <Star className="mr-2 h-4 w-4" /> Hamyon & Bonuslar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProfileOpen(true)} className="rounded-xl py-2.5">
                  <UserRound className="mr-2 h-4 w-4" /> {t("edit_profile")}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="rounded-xl py-2.5 text-[#EE7526]">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> {t("admin_panel")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl py-2.5 text-red-500 focus:text-red-500"
                  onClick={async () => { await signOut(); toast.success(t("logged_out")); goHome(); }}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button onClick={() => navigate("/login")}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition text-neutral-500">
              <UserRound className="h-6 w-6" />
              <span className="text-[10px] font-medium">Kirish</span>
            </button>
          )}
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
      />
    </div>
  );
};

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
  const discountPct = (product as unknown as { discount_percent?: number }).discount_percent;
  const origPrice = (product as unknown as { original_price?: number }).original_price;
  const warranty = (product as unknown as { warranty?: string }).warranty;
  const sold = product.sold_count;
  const rating = sold > 0 ? (4.1 + (product.id.charCodeAt(0) % 9) / 10).toFixed(1) : null;

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition active:scale-[0.98]"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image */}
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

        {/* Discount badge */}
        {discountPct && !outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-xl bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            -{discountPct}%
          </span>
        )}

        {/* Tugadi overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-2xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white">Tugadi</span>
          </div>
        )}

        {/* In-cart badge */}
        {inCart && !outOfStock && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-[#EE7526] px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <CheckCircle2 className="h-3 w-3" /> {cartQty} ta
          </div>
        )}

        {/* Wishlist */}
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110"
          onClick={e => { e.stopPropagation(); onToggleWishlist(); toast.success(inWishlist ? "Sevimlilardan olib tashlandi" : "Sevimlilariga qo'shildi"); }}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? "fill-red-500 text-red-500" : "text-neutral-400"}`} />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        {/* Warranty */}
        {warranty && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
            <ShieldCheck className="h-3 w-3" /> Kafolat {warranty}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <p className="text-[17px] font-extrabold leading-tight text-neutral-900">
            {formatPrice(Number(product.price))}
          </p>
        </div>
        {origPrice && origPrice > Number(product.price) && (
          <p className="text-xs text-neutral-400 line-through">{formatPrice(origPrice)}</p>
        )}

        {/* Name */}
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-neutral-700">
          {product.name}
        </p>

        {/* Rating */}
        {rating && sold > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[12px] font-semibold text-neutral-700">{rating}</span>
            <span className="text-[11px] text-neutral-400">
              ({sold > 999 ? (sold / 1000).toFixed(1) + "k" : sold})
            </span>
          </div>
        )}

        {/* Add to cart button */}
        {!outOfStock && (
          <button
            onClick={e => { e.stopPropagation(); onAddToCart(product); toast.success("Savatga qo'shildi"); }}
            className={`mt-2.5 w-full rounded-xl py-2 text-[13px] font-bold transition active:scale-95 ${
              inCart ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#EE7526] text-white hover:bg-[#d8661c]"
            }`}
          >
            {inCart ? "Yana qo'shish" : "Savatga"}
          </button>
        )}
      </div>
    </article>
  );
}

function CatalogSection({ products, loading, category, onCategoryChange, onAddToCart, inWishlist, onToggleWishlist }: CatalogProps) {
  const { format: formatPrice } = useCurrency();
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
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-white px-3 pt-3 pb-2 shadow-sm">
        <div className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-[#f7f7f7]">
          <Search className="ml-3 h-4 w-4 shrink-0 self-center text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mahsulot qidiring..."
            className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="px-3 text-neutral-400 font-bold text-lg">×</button>
          )}
        </div>

        {/* Category chips */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["", ...CATEGORIES].map(cat => (
            <button
              key={cat || "all"}
              onClick={() => onCategoryChange(cat)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                category === cat
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              {cat || "Barchasi"}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="px-3 py-2 text-xs text-neutral-400 font-medium">
        {loading ? "" : `${filtered.length} ta mahsulot`}
        {category && <span className="ml-1 text-[#EE7526]">· {category}</span>}
      </div>

      {/* Grid */}
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
              className="mt-2 text-sm font-semibold text-[#EE7526]">Filterni tozalash</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Index;
