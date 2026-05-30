import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type UserProfile = Database["public"]["Tables"]["users"]["Row"];

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string | null;
};

type CheckoutForm = {
  full_name: string;
  phone: string;
  region: string;
  notes: string;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
};

const regions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Andijon viloyati",
  "Namangan viloyati",
  "Qashqadaryo viloyati",
  "Surxondaryo viloyati",
  "Navoiy viloyati",
  "Xorazm viloyati",
  "Jizzax viloyati",
  "Sirdaryo viloyati",
  "Qoraqalpog'iston R.",
];

const featureCards = [
  { title: "AI aniqlash", icon: Sparkles },
  { title: "O'rnatish", icon: Truck },
  { title: "2 yil kafolat", icon: BadgeCheck },
];

const defaultCheckoutForm: CheckoutForm = {
  full_name: "",
  phone: "",
  region: "",
  notes: "",
};

const statusMeta: Record<Order["status"], { label: string; className: string }> = {
  yangi: { label: "Yangi", className: "bg-[#fff4ec] text-[#b4571c]" },
  qabul_qilindi: { label: "Qabul qilindi", className: "bg-emerald-50 text-emerald-700" },
  tolov_jarayonida: { label: "To'lov jarayonida", className: "bg-blue-50 text-blue-700" },
  qadoqlanmoqda: { label: "Qadoqlanmoqda", className: "bg-purple-50 text-purple-700" },
  yetkazilmoqda: { label: "Yetkazilmoqda", className: "bg-orange-50 text-[#b4571c]" },
  mijoz_qabul_qildi: { label: "Mijoz qabul qildi", className: "bg-orange-100 text-[#9a4a18]" },
  rad_etildi: { label: "Rad etildi", className: "bg-[#fff1f1] text-[#b53b3b]" },
};

function formatPrice(value: number) {
  return `${Number(value).toLocaleString("uz-UZ")} so'm`;
}

function getInitials(name?: string | null) {
  if (!name) return "SC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getFallbackProfile(user: User): Database["public"]["Tables"]["users"]["Insert"] {
  return {
    id: user.id,
    google_id: user.id,
    full_name:
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Foydalanuvchi",
    email: user.email ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };
}

function extractOrderItems(value: Json): OrderItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, Json>;
      return {
        product_id: String(row.product_id ?? ""),
        product_name: String(row.product_name ?? "Mahsulot"),
        price: Number(row.price ?? 0),
        quantity: Number(row.quantity ?? 0),
      } satisfies OrderItem;
    })
    .filter((item): item is OrderItem => Boolean(item));
}

const Index = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, user, signOut } = useSessionContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"home" | "orders">("home");
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(defaultCheckoutForm);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const saved = window.localStorage.getItem("smartcam_cart");
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const promptedProfileRef = useRef(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  useEffect(() => {
    window.localStorage.setItem("smartcam_cart", JSON.stringify(cart));
  }, [cart]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Mahsulotlarni yuklashda xato yuz berdi.");
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    setProducts(data ?? []);
    setProductsLoading(false);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Buyurtmalarni yuklab bo'lmadi.");
      setOrdersLoading(false);
      return;
    }

    setOrders(data ?? []);
    setOrdersLoading(false);
  }, [user]);

  const ensureProfile = useCallback(async (currentUser: User) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      toast.error("Profil ma'lumotlarini olishda xato yuz berdi.");
      return;
    }

    if (data) {
      setProfile(data);
      setCheckoutForm((prev) => ({
        ...prev,
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        region: data.region ?? "",
      }));
      return;
    }

    const fallbackProfile = getFallbackProfile(currentUser);
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert(fallbackProfile)
      .select("*")
      .single();

    if (insertError) {
      toast.error("Profil yaratilmadi. Qayta urinib ko'ring.");
      return;
    }

    setProfile(inserted);
    setCheckoutForm((prev) => ({
      ...prev,
      full_name: inserted.full_name ?? "",
      phone: inserted.phone ?? "",
      region: inserted.region ?? "",
    }));
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setOrders([]);
      promptedProfileRef.current = false;
      return;
    }

    void ensureProfile(user);
  }, [ensureProfile, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`smartcam-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nextStatus = payload.new.status as Order["status"];
          const prevStatus = payload.old?.status as Order["status"] | undefined;
          if (prevStatus && prevStatus !== nextStatus) {
            toast.info(`Buyurtma holati yangilandi: ${statusMeta[nextStatus]?.label ?? nextStatus}`);
          }
          void loadOrders();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadOrders, user]);

  useEffect(() => {
    if (!profile || promptedProfileRef.current) return;

    if (!profile.phone || !profile.region) {
      promptedProfileRef.current = true;
      setProfileOpen(true);
    }
  }, [profile]);

  const showOrdersSection = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setActiveSection("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadOrders();
  };

  const goHome = () => {
    setActiveSection("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToCatalog = () => {
    setActiveSection("home");
    requestAnimationFrame(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openCheckout = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setCheckoutForm((prev) => ({
      ...prev,
      full_name: profile?.full_name ?? prev.full_name,
      phone: profile?.phone ?? prev.phone,
      region: profile?.region ?? prev.region,
    }));
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, qty: Math.max(1, Math.min(99, item.qty + delta)) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const addToCart = (product: Product) => {
    const fallbackImage = product.images?.[0] ?? "/assets/smartcam-outdoor-camera.png";

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(99, item.qty + 1) } : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          qty: 1,
          image: fallbackImage,
        },
      ];
    });

    toast.success(`${product.name} savatga qo'shildi.`);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    if (!checkoutForm.full_name || !checkoutForm.phone || !checkoutForm.region) {
      toast.error("Profil uchun barcha asosiy maydonlarni to'ldiring.");
      return;
    }

    setProfileSaving(true);

    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: checkoutForm.full_name,
        phone: checkoutForm.phone,
        region: checkoutForm.region,
      })
      .eq("id", user.id)
      .select("*")
      .single();

    setProfileSaving(false);

    if (error) {
      toast.error("Profilni saqlab bo'lmadi.");
      return;
    }

    setProfile(data);
    setProfileOpen(false);
    toast.success("Profil ma'lumotlari saqlandi.");
  };

  const placeOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!cart.length) {
      toast.error("Savat hozircha bo'sh.");
      return;
    }

    if (!checkoutForm.full_name || !checkoutForm.phone || !checkoutForm.region) {
      toast.error("Buyurtma uchun ism, telefon va hududni kiriting.");
      return;
    }

    setPlacingOrder(true);

    const { data: updatedProfile, error: profileError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        google_id: profile?.google_id ?? user.id,
        email: user.email ?? null,
        avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        full_name: checkoutForm.full_name,
        phone: checkoutForm.phone,
        region: checkoutForm.region,
      })
      .select("*")
      .single();

    if (profileError) {
      setPlacingOrder(false);
      toast.error("Profilni yangilashda xato yuz berdi.");
      return;
    }

    setProfile(updatedProfile);

    const orderItems: OrderItem[] = cart.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.qty,
    }));

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        items: orderItems,
        total_amount: cartTotal,
        status: "yangi",
        payment_status: "unpaid",
        customer_name: checkoutForm.full_name,
        customer_phone: checkoutForm.phone,
        customer_region: checkoutForm.region,
        notes: checkoutForm.notes || null,
      })
      .select("*")
      .single();

    setPlacingOrder(false);

    if (error) {
      toast.error("Buyurtma yuborilmadi. Iltimos, qayta urinib ko'ring.");
      return;
    }

    setCart([]);
    setCheckoutOpen(false);
    setCheckoutForm((prev) => ({ ...prev, notes: "" }));
    toast.success(`Buyurtma qabul qilindi: #${order.id.slice(0, 8).toUpperCase()}`);
    setActiveSection("orders");
    await loadOrders();
  };

  const openTelegramLink = async (type: "connect" | "order", orderId?: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadingKey = orderId ?? type;
    setTelegramLinkLoading(loadingKey);

    const { data, error } = await supabase.functions.invoke("telegram-link", {
      body: {
        type,
        orderId,
      },
    });

    setTelegramLinkLoading(null);

    if (error || !data?.url) {
      toast.error("Telegram havolasini yaratib bo'lmadi.");
      return;
    }

    window.open(data.url as string, "_blank", "noopener,noreferrer");
  };

  const nextSlide = (productId: string, imagesLength: number, direction: number) => {
    setActiveSlides((current) => {
      const currentIndex = current[productId] ?? 0;
      const nextIndex = (currentIndex + direction + imagesLength) % imagesLength;
      return { ...current, [productId]: nextIndex };
    });
  };

  const productCountText = `${products.length}+ model`;

  return (
    <div className="relative min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/90 backdrop-blur-md">
        <div className="container-shell flex items-center justify-between gap-4 py-3">
          <button
            onClick={goHome}
            className="flex items-center gap-2.5 rounded-full transition hover:opacity-80"
          >
            <img
              src="/assets/smartcam-logo.png"
              alt="SmartCam"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-orange-100"
            />
            <span className="font-syne text-lg font-bold text-neutral-900">SmartCam</span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            <Button
              variant="ghost"
              className="rounded-full px-4 text-neutral-600 hover:bg-orange-50 hover:text-[#EE7526]"
              onClick={goHome}
            >
              Bosh sahifa
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-4 text-neutral-600 hover:bg-orange-50 hover:text-[#EE7526]"
              onClick={scrollToCatalog}
            >
              Katalog
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-4 text-neutral-600 hover:bg-orange-50 hover:text-[#EE7526]"
              onClick={() => void showOrdersSection()}
            >
              Buyurtmalarim
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 rounded-full border-orange-100 bg-white text-neutral-800 hover:bg-orange-50"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EE7526] px-1 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Button>

            {sessionLoading ? (
              <div className="flex h-10 items-center rounded-full border border-orange-100 px-3 text-sm text-neutral-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#EE7526]" />
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-1 ring-orange-100 transition hover:ring-orange-200">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-orange-50 font-semibold text-[#EE7526]">
                        {getInitials(profile?.full_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-orange-100 p-2">
                  <div className="px-3 py-2">
                    <p className="font-syne font-bold text-neutral-900">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void showOrdersSection()} className="rounded-2xl py-3">
                    <Package className="mr-2 h-4 w-4" />
                    Buyurtmalarim
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setProfileOpen(true)} className="rounded-2xl py-3">
                    <UserRound className="mr-2 h-4 w-4" />
                    Profilni tahrirlash
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-2xl py-3 text-[#b4571c] focus:text-[#b4571c]"
                    onClick={async () => {
                      await signOut();
                      toast.success("Hisobdan chiqildi.");
                      goHome();
                    }}
                  >
                    Chiqish
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]"
              >
                Kirish
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {activeSection === "home" ? (
          <>
            <section className="container-shell grid gap-8 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
              <div className="space-y-6">
                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 sm:text-5xl">
                  Aqlli kamera.
                  <span className="text-[#EE7526]"> Oddiy nazorat.</span>
                </h1>
                <p className="max-w-md text-neutral-500">
                  Uy va ofis uchun. Yetkazib berish va o'rnatish bilan.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[#EE7526] px-6 text-white hover:bg-[#d8661c]"
                    onClick={scrollToCatalog}
                  >
                    Katalog
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!user ? (
                    <Button
                      variant="outline"
                      className="rounded-full border-orange-200 bg-white text-neutral-800 hover:bg-orange-50"
                      onClick={() => navigate("/login")}
                    >
                      Kirish
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-6 border-t border-orange-100 pt-6 text-sm">
                  {[
                    { value: "2,400+", label: "Mijoz" },
                    { value: "4.9", label: "Baho" },
                    { value: productCountText, label: "Model" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-xl font-bold text-[#EE7526]">{item.value}</div>
                      <div className="text-neutral-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-white p-3 ring-1 ring-orange-100">
                <img
                  src="/assets/smartcam-hero.png"
                  alt="SmartCam kamera"
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-[#EE7526]">X1</p>
                    <p className="font-syne font-bold text-neutral-900">Smart Micro Camera</p>
                  </div>
                  <p className="font-syne text-lg font-bold text-[#EE7526]">850 000 so'm</p>
                </div>
              </div>
            </section>

            <section className="border-y border-orange-50 bg-orange-50/40">
              <div className="container-shell grid grid-cols-3 gap-4 py-8 sm:gap-8">
                {featureCards.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left"
                  >
                    <feature.icon className="h-8 w-8 shrink-0 text-[#EE7526]" />
                    <span className="text-sm font-semibold text-neutral-800">{feature.title}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="catalog" className="container-shell py-12">
              <h2 className="mb-8 font-syne text-2xl font-bold text-neutral-900 sm:text-3xl">
                Katalog
              </h2>

              {productsLoading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="panel-surface h-[420px] animate-pulse bg-white/70" />
                  ))}
                </div>
              ) : products.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {products.map((product) => {
                    const images = product.images?.length
                      ? product.images
                      : ["/assets/smartcam-outdoor-camera.png"];
                    const currentSlide = activeSlides[product.id] ?? 0;

                    return (
                      <article
                        key={product.id}
                        className="panel-surface overflow-hidden p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(238,117,38,0.12)]"
                      >
                        <div className="relative overflow-hidden rounded-xl bg-orange-50">
                          <img
                            src={images[currentSlide]}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.src = "/assets/smartcam-outdoor-camera.png";
                            }}
                            className="h-64 w-full object-cover"
                          />
                          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-medium text-[#EE7526] shadow-sm">
                            Mavjud
                          </div>

                          {images.length > 1 ? (
                            <>
                              <button
                                onClick={() => nextSlide(product.id, images.length, -1)}
                                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-sm transition hover:bg-white"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => nextSlide(product.id, images.length, 1)}
                                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-sm transition hover:bg-white"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/75 px-3 py-2 backdrop-blur">
                                {images.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      setActiveSlides((current) => ({
                                        ...current,
                                        [product.id]: index,
                                      }))
                                    }
                                    className={`h-2.5 rounded-full transition ${
                                      currentSlide === index
                                        ? "w-6 bg-[#EE7526]"
                                        : "w-2.5 bg-orange-200"
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3 pt-4">
                          <div>
                            <h3 className="font-syne text-lg font-bold text-neutral-900">{product.name}</h3>
                            {product.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                                {product.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-orange-50 pt-3">
                            <div className="text-lg font-bold text-[#EE7526]">
                              {formatPrice(Number(product.price))}
                            </div>
                            <Button
                              className="rounded-full bg-[#EE7526] px-4 text-white hover:bg-[#d8661c]"
                              onClick={() => addToCart(product)}
                            >
                              <Plus className="h-4 w-4" />
                              Savatga
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="panel-surface p-10 text-center">
                  <Camera className="mx-auto h-10 w-10 text-[#EE7526]" />
                  <p className="mt-3 text-neutral-500">Mahsulotlar hozircha yo'q</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="container-shell py-10 sm:py-14">
            <Button
              variant="ghost"
              className="mb-5 rounded-full px-4 text-neutral-600 hover:bg-orange-50"
              onClick={goHome}
            >
              <ChevronLeft className="h-4 w-4" />
              Orqaga
            </Button>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="font-syne text-2xl font-bold text-neutral-900 sm:text-3xl">
                Buyurtmalarim
              </h1>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-full border-orange-200 bg-white text-neutral-800 hover:bg-orange-50"
                  onClick={() => void openTelegramLink("connect")}
                  disabled={telegramLinkLoading === "connect"}
                >
                  {telegramLinkLoading === "connect" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Telegram ulash
                </Button>
                <Button
                  className="rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]"
                  onClick={scrollToCatalog}
                >
                  Yana mahsulot tanlash
                </Button>
              </div>
            </div>

            {ordersLoading ? (
              <div className="panel-surface p-8 text-sm text-[#5C7260]">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Buyurtmalar yuklanmoqda...
              </div>
            ) : orders.length ? (
              <div className="space-y-4">
                {orders.map((order) => {
                  const items = extractOrderItems(order.items);
                  return (
                    <article key={order.id} className="panel-surface p-6 sm:p-7">
                      <div className="flex flex-col gap-4 border-b border-[#eef2ed] pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-[#7b927d]">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </div>
                          <h2 className="mt-2 text-2xl font-extrabold text-[#1A3828]">
                            {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </h2>
                          <p className="mt-2 text-sm text-[#5C7260]">
                            {order.customer_name} · {order.customer_phone} · {order.customer_region}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusMeta[order.status].className}`}
                        >
                          {statusMeta[order.status].label}
                        </span>
                      </div>

                      <div className="space-y-3 pt-5">
                        {items.map((item) => (
                          <div
                            key={`${order.id}-${item.product_id}`}
                            className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f8fbf7] px-4 py-3 text-sm"
                          >
                            <div>
                              <div className="font-semibold text-[#254A34]">{item.product_name}</div>
                              <div className="text-[#5C7260]">{item.quantity} dona</div>
                            </div>
                            <div className="font-bold text-[#254A34]">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-[#eef2ed] pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-xl text-sm leading-7 text-[#5C7260]">
                          {order.notes ? `Izoh: ${order.notes}` : "Buyurtma uchun maxsus izoh qoldirilmagan."}
                        </div>
                        <div className="flex flex-col items-start gap-3 sm:items-end">
                          <Button
                            variant="outline"
                            className="rounded-full border-[#dbe7d8] bg-white text-[#254A34] hover:bg-[#edf4ec]"
                            onClick={() => void openTelegramLink("order", order.id)}
                            disabled={telegramLinkLoading === order.id}
                          >
                            {telegramLinkLoading === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                            Telegramda kuzatish
                          </Button>
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-[0.18em] text-[#7b927d]">Jami summa</div>
                            <div className="mt-1 text-2xl font-extrabold text-[#254A34]">
                              {formatPrice(Number(order.total_amount))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="panel-surface p-10 text-center">
                <Package className="mx-auto h-12 w-12 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
                <h2 className="mt-4 text-2xl font-extrabold text-[#1A3828]">Hali buyurtma yo'q</h2>
                <p className="mt-3 text-sm leading-7 text-[#5C7260]">
                  Birinchi buyurtmangizni bering va bu yerda uning holatini kuzating.
                </p>
                <Button
                  className="mt-6 rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]"
                  onClick={scrollToCatalog}
                >
                  Katalogga o'tish
                </Button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-orange-100 bg-[#EE7526] py-8 text-white">
        <div className="container-shell flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/smartcam-logo.png" alt="SmartCam" className="h-8 w-8 rounded-full ring-2 ring-white/30" />
            <span className="font-syne text-lg font-bold">SmartCam</span>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-white/90">
            <button onClick={goHome} className="transition hover:text-white">
              Bosh sahifa
            </button>
            <button onClick={scrollToCatalog} className="transition hover:text-white">
              Katalog
            </button>
            <button onClick={() => void showOrdersSection()} className="transition hover:text-white">
              Buyurtmalarim
            </button>
          </nav>
          <div className="flex flex-wrap gap-4 text-sm text-white/90">
            <a href="tel:+998901234567" className="transition hover:text-white">
              +998 90 123 45 67
            </a>
            <a href="mailto:info@smartcam.uz" className="transition hover:text-white">
              info@smartcam.uz
            </a>
          </div>
        </div>
      </footer>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full max-w-xl border-l-[#e7eee5] bg-[#fcfdfc] p-0 sm:max-w-xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-[#e7eee5] px-6 py-6 text-left">
              <SheetTitle className="font-syne text-2xl font-extrabold text-[#1A3828]">Savat</SheetTitle>
              <SheetDescription className="text-sm text-[#5C7260]">
                Tanlangan mahsulotlar va buyurtma summasi.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-[#e6efe3] bg-white p-4 shadow-sm">
                    <div className="flex gap-4">
                      <img
                        src={item.image ?? "/assets/smartcam-outdoor-camera.png"}
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.src = "/assets/smartcam-outdoor-camera.png";
                        }}
                        className="h-20 w-20 rounded-[18px] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold text-[#254A34]">{item.name}</h3>
                        <p className="mt-1 text-sm text-[#5C7260]">{formatPrice(item.price)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-[#dbe7d8] bg-[#f8fbf7] p-1">
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[#254A34] transition hover:bg-white"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-[#254A34]">
                              {item.qty}
                            </span>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[#254A34] transition hover:bg-white"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-sm font-semibold text-[#b4571c] transition hover:text-[#8e4413]"
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#dbe7d8] bg-white px-8 text-center">
                  <ShoppingBag className="h-12 w-12 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
                  <h3 className="mt-4 text-2xl font-extrabold text-[#1A3828]">Savat bo'sh</h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-[#5C7260]">
                    Kameralarni tanlang, savatga qo'shing va bir necha bosqichda buyurtma bering.
                  </p>
                  <Button
                    className="mt-6 rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]"
                    onClick={() => {
                      setCartOpen(false);
                      scrollToCatalog();
                    }}
                  >
                    Katalogga o'tish
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-[#e7eee5] bg-white px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-[#5C7260]">Jami summa</span>
                <span className="text-2xl font-extrabold text-[#254A34]">{formatPrice(cartTotal)}</span>
              </div>
              <Button
                disabled={!cart.length}
                className="h-12 w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]"
                onClick={openCheckout}
              >
                <CreditCard className="h-4 w-4" />
                Buyurtma berish
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg rounded-[30px] border-[#dbe7d8] bg-[#fcfdfc] p-0">
          <DialogHeader className="border-b border-[#e7eee5] px-6 py-6 text-left">
            <DialogTitle className="font-syne text-2xl font-extrabold text-[#1A3828]">Profil ma'lumotlari</DialogTitle>
            <DialogDescription className="text-sm text-[#5C7260]">
              Buyurtmalarni tez rasmiylashtirish uchun asosiy ma'lumotlarni saqlang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Ism-familiya</label>
              <Input
                value={checkoutForm.full_name}
                onChange={(event) =>
                  setCheckoutForm((prev) => ({ ...prev, full_name: event.target.value }))
                }
                className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
                placeholder="Ism va familiya"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Telefon</label>
              <Input
                value={checkoutForm.phone}
                onChange={(event) =>
                  setCheckoutForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
                placeholder="+998 90 123 45 67"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Viloyat / shahar</label>
              <select
                value={checkoutForm.region}
                onChange={(event) =>
                  setCheckoutForm((prev) => ({ ...prev, region: event.target.value }))
                }
                className="flex h-12 w-full rounded-2xl border border-[#dbe7d8] bg-white px-4 text-sm outline-none transition focus:border-[#EE7526]"
              >
                <option value="">Hududni tanlang</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={profileSaving}
              className="h-12 w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]"
              onClick={handleProfileSave}
            >
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl rounded-[30px] border-[#dbe7d8] bg-[#fcfdfc] p-0">
          <DialogHeader className="border-b border-[#e7eee5] px-6 py-6 text-left">
            <DialogTitle className="font-syne text-2xl font-extrabold text-[#1A3828]">Buyurtmani tasdiqlash</DialogTitle>
            <DialogDescription className="text-sm text-[#5C7260]">
              Yetkazib berish ma'lumotlarini kiriting va xaridni yakunlang.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-[#e6efe3] bg-white p-5">
              <h3 className="font-syne text-xl font-extrabold text-[#254A34]">Savat xulosasi</h3>
              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-[#254A34]">{item.name}</div>
                      <div className="text-[#5C7260]">{item.qty} dona</div>
                    </div>
                    <div className="font-semibold text-[#254A34]">
                      {formatPrice(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-[#eef2ed] pt-5">
                <div className="flex items-center justify-between text-sm text-[#5C7260]">
                  <span>Jami</span>
                  <span className="text-2xl font-extrabold text-[#254A34]">{formatPrice(cartTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Ism-familiya</label>
                <Input
                  value={checkoutForm.full_name}
                  onChange={(event) =>
                    setCheckoutForm((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
                  placeholder="Ism va familiya"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Telefon</label>
                <Input
                  value={checkoutForm.phone}
                  onChange={(event) =>
                    setCheckoutForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Viloyat / shahar</label>
                <select
                  value={checkoutForm.region}
                  onChange={(event) =>
                    setCheckoutForm((prev) => ({ ...prev, region: event.target.value }))
                  }
                  className="flex h-12 w-full rounded-2xl border border-[#dbe7d8] bg-white px-4 text-sm outline-none transition focus:border-[#EE7526]"
                >
                  <option value="">Hududni tanlang</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Qo'shimcha izoh</label>
                <textarea
                  value={checkoutForm.notes}
                  onChange={(event) =>
                    setCheckoutForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="min-h-28 w-full rounded-[24px] border border-[#dbe7d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EE7526]"
                  placeholder="Manzil, qavat, qo'shimcha talablar..."
                />
              </div>
              <Button
                disabled={placingOrder || !cart.length}
                className="h-12 w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]"
                onClick={placeOrder}
              >
                {placingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Buyurtmani yuborish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
