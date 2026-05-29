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
  Minus,
  Package,
  Plus,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  {
    title: "AI Harakatni aniqlash",
    description:
      "Odam, mashina va g'ayrioddiy harakatlarni tez ajratib, foydali ogohlantirishlarni yuboradi.",
    icon: Sparkles,
  },
  {
    title: "Premium o'rnatish xizmati",
    description:
      "Hududingiz bo'yicha mutaxassis yetib boradi, sozlaydi va telefoningizga ulab beradi.",
    icon: Truck,
  },
  {
    title: "Ishonchli kafolat",
    description:
      "Har bir qurilma original manbadan keltiriladi va rasmiy kafolat bilan topshiriladi.",
    icon: BadgeCheck,
  },
];

const testimonials = [
  {
    name: "Aziza Xasanova",
    role: "Uy egasi, Toshkent",
    quote:
      "Yetkazib berish ham, o'rnatish ham juda silliq o'tdi. Telefonimdan hovlini bemalol kuzatyapman.",
  },
  {
    name: "Murod Ergashev",
    role: "Ofis menejeri, Samarqand",
    quote:
      "PTZ kamera sifati kutilganidan ham yuqori bo'ldi. Kechasi ham aniq ko'rsatadi.",
  },
];

const defaultCheckoutForm: CheckoutForm = {
  full_name: "",
  phone: "",
  region: "",
  notes: "",
};

const statusMeta: Record<Order["status"], { label: string; className: string }> = {
  yangi: { label: "Yangi", className: "bg-[#fff4ec] text-[#b4571c]" },
  yetkazilmoqda: { label: "Yetkazilmoqda", className: "bg-[#edf4ec] text-[#2f6b43]" },
  yopildi: { label: "Yopildi", className: "bg-[#e9f7f0] text-[#1f7a4b]" },
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
          toast.info(`Buyurtma holati yangilandi: ${statusMeta[nextStatus]?.label ?? nextStatus}`);
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

  const nextSlide = (productId: string, imagesLength: number, direction: number) => {
    setActiveSlides((current) => {
      const currentIndex = current[productId] ?? 0;
      const nextIndex = (currentIndex + direction + imagesLength) % imagesLength;
      return { ...current, [productId]: nextIndex };
    });
  };

  const productCountText = `${products.length}+ model`;

  return (
    <div className="relative min-h-screen overflow-hidden text-[#1C2E1E]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f7faf7]/85 backdrop-blur-xl">
        <div className="container-shell flex items-center justify-between gap-4 py-4">
          <button
            onClick={goHome}
            className="flex items-center gap-3 rounded-full border border-[#dbe7d8] bg-white px-3 py-2 text-left shadow-sm transition hover:shadow"
          >
            <img
              src="/assets/smartcam-logo.png"
              alt="SmartCam"
              className="h-11 w-11 rounded-full object-cover"
            />
            <div>
              <div className="font-syne text-lg font-extrabold text-[#254A34]">SmartCam</div>
              <div className="text-xs font-medium text-[#5C7260]">Aqlli kameralar do'koni</div>
            </div>
          </button>

          <nav className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              className="rounded-full px-5 text-[#45624d] hover:bg-white"
              onClick={goHome}
            >
              Bosh sahifa
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-5 text-[#45624d] hover:bg-white"
              onClick={scrollToCatalog}
            >
              Katalog
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-5 text-[#45624d] hover:bg-white"
              onClick={() => void showOrdersSection()}
            >
              Buyurtmalarim
            </Button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 rounded-full border-[#dbe7d8] bg-white text-[#254A34] hover:bg-[#edf4ec]"
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
              <div className="flex h-11 items-center rounded-full border border-[#dbe7d8] bg-white px-4 text-sm text-[#5C7260]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yuklanmoqda
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full border border-[#dbe7d8] bg-white p-1 shadow-sm transition hover:shadow-md">
                    <Avatar className="h-10 w-10 border border-[#edf4ec]">
                      <AvatarImage src={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-[#edf4ec] font-semibold text-[#254A34]">
                        {getInitials(profile?.full_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-3xl border-[#dbe7d8] p-2">
                  <div className="px-3 py-2">
                    <p className="font-syne text-lg font-bold text-[#254A34]">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="text-sm text-[#5C7260]">{user.email}</p>
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
            <section className="container-shell grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
              <div className="space-y-8">
                <Badge className="rounded-full border-0 bg-[#edf4ec] px-4 py-2 text-sm font-semibold text-[#4A7A5A]">
                  O'zbekistonda xavfsizlik uchun tanlangan premium do'kon
                </Badge>

                <div className="space-y-5">
                  <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-[#1A3828] sm:text-5xl lg:text-6xl">
                    Hamma joyni aqlli nazorat ostida ushlang.
                  </h1>
                  <p className="max-w-xl text-base leading-8 text-[#5C7260] sm:text-lg">
                    SmartCam professional kameralari uy, ofis va biznes uchun ishlab
                    chiqilgan. Premium uskuna, tez yetkazib berish va real vaqt nazorati
                    bitta ekotizimda jamlangan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    className="rounded-full bg-[#EE7526] px-6 py-6 text-base text-white hover:bg-[#d8661c]"
                    onClick={scrollToCatalog}
                  >
                    Katalogni ko'rish
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#dbe7d8] bg-white px-6 py-6 text-base text-[#254A34] hover:bg-[#edf4ec]"
                    onClick={() => (user ? setProfileOpen(true) : navigate("/login"))}
                  >
                    {user ? "Profilni to'ldirish" : "Ro'yxatdan o'tish"}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { value: "2,400+", label: "Baxtli mijoz" },
                    { value: "4.9/5", label: "O'rtacha baho" },
                    { value: productCountText, label: "Faol mahsulotlar" },
                  ].map((item) => (
                    <div key={item.label} className="panel-surface p-5">
                      <div className="text-3xl font-extrabold text-[#254A34]">{item.value}</div>
                      <p className="mt-2 text-sm text-[#5C7260]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="panel-surface overflow-hidden p-4 sm:p-5">
                  <img
                    src="/assets/smartcam-hero.png"
                    alt="Premium SmartCam kamera"
                    className="h-[360px] w-full rounded-[24px] object-cover sm:h-[420px]"
                  />
                  <div className="grid gap-4 px-2 pb-2 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#4A7A5A]">
                        <Star className="h-4 w-4 fill-[#EE7526] text-[#EE7526]" />
                        Premium tavsiya
                      </div>
                      <h2 className="mt-2 text-2xl font-extrabold text-[#1A3828]">
                        Smart Micro Camera X1
                      </h2>
                      <p className="mt-2 max-w-md text-sm leading-7 text-[#5C7260]">
                        4K tasvir, night vision, Wi‑Fi va qulay mobil boshqaruv bilan
                        uy xavfsizligi uchun ideal model.
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-[#254A34] px-5 py-4 text-white">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/70">Boshlanish narxi</div>
                      <div className="mt-2 text-2xl font-extrabold">850 000 so'm</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="panel-surface flex items-center gap-4 p-5">
                    <Shield className="h-12 w-12 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
                    <div>
                      <h3 className="font-syne text-lg font-bold text-[#254A34]">2 yil kafolat</h3>
                      <p className="text-sm leading-6 text-[#5C7260]">Original mahsulot va ishonchli servis.</p>
                    </div>
                  </div>
                  <div className="panel-surface flex items-center gap-4 p-5">
                    <Truck className="h-12 w-12 rounded-full bg-[#fff4ec] p-3 text-[#EE7526]" />
                    <div>
                      <h3 className="font-syne text-lg font-bold text-[#254A34]">1–2 kun yetkazish</h3>
                      <p className="text-sm leading-6 text-[#5C7260]">Hududga qarab tezkor yetkazib berish.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="container-shell py-6 lg:py-10">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="panel-surface overflow-hidden p-4 sm:p-5">
                  <img
                    src="/assets/smartcam-ai-illustration.png"
                    alt="AI kuzatuv tizimi"
                    className="h-full min-h-[320px] w-full rounded-[24px] object-cover"
                  />
                </div>

                <div className="space-y-5">
                  <div>
                    <Badge className="rounded-full border-0 bg-[#fff4ec] px-4 py-2 text-sm font-semibold text-[#b4571c]">
                      Nega SmartCam?
                    </Badge>
                    <h2 className="mt-4 text-3xl font-extrabold text-[#1A3828] sm:text-4xl">
                      Yumshoq dizayn ichida kuchli texnologiya.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C7260]">
                      Biz mahsulotga urg'u berilgan, xavfsizlikka ishonch uyg'otuvchi va
                      foydalanishga oson bo'lgan xarid tajribasini yaratdik.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {featureCards.map((feature) => (
                      <div key={feature.title} className="panel-surface p-5">
                        <feature.icon className="h-11 w-11 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
                        <h3 className="mt-4 text-lg font-bold text-[#254A34]">{feature.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[#5C7260]">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="catalog" className="container-shell py-10">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge className="rounded-full border-0 bg-[#edf4ec] px-4 py-2 text-sm font-semibold text-[#4A7A5A]">
                    SmartCam katalogi
                  </Badge>
                  <h2 className="mt-4 text-3xl font-extrabold text-[#1A3828] sm:text-4xl">
                    Har bir ehtiyojga mos kamera tanlovi
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-[#5C7260] sm:text-base">
                  Hovli, ofis, koridor yoki kirish eshigi uchun mos variantlarni bitta
                  joyda ko'ring va darhol savatga qo'shing.
                </p>
              </div>

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
                        className="panel-surface overflow-hidden p-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(44,90,61,0.14)]"
                      >
                        <div className="relative overflow-hidden rounded-[24px] bg-[#edf4ec]">
                          <img
                            src={images[currentSlide]}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.src = "/assets/smartcam-outdoor-camera.png";
                            }}
                            className="h-64 w-full object-cover"
                          />
                          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#254A34] shadow-sm">
                            Mavjud
                          </div>

                          {images.length > 1 ? (
                            <>
                              <button
                                onClick={() => nextSlide(product.id, images.length, -1)}
                                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#254A34] shadow-sm transition hover:bg-white"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => nextSlide(product.id, images.length, 1)}
                                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#254A34] shadow-sm transition hover:bg-white"
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
                                        : "w-2.5 bg-[#c8d9c3]"
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>

                        <div className="space-y-4 p-3 pb-2 pt-5">
                          <div>
                            <h3 className="text-xl font-extrabold text-[#1A3828]">{product.name}</h3>
                            <p className="mt-2 text-sm leading-7 text-[#5C7260]">
                              {product.description || "Premium xavfsizlik kamerasi"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-[#edf2eb] pt-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-[#7b927d]">Narxi</div>
                              <div className="mt-1 text-2xl font-extrabold text-[#254A34]">
                                {formatPrice(Number(product.price))}
                              </div>
                            </div>
                            <Button
                              className="rounded-full bg-[#254A34] px-5 text-white hover:bg-[#1A3828]"
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
                  <Camera className="mx-auto h-12 w-12 rounded-full bg-[#edf4ec] p-3 text-[#EE7526]" />
                  <h3 className="mt-4 text-2xl font-extrabold text-[#1A3828]">Mahsulotlar topilmadi</h3>
                  <p className="mt-3 text-sm leading-7 text-[#5C7260]">
                    Supabase katalogi bo'sh ko'rinmoqda. Keyinroq qayta tekshiring.
                  </p>
                </div>
              )}
            </section>

            <section className="container-shell py-10">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="panel-surface overflow-hidden p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <Badge className="rounded-full border-0 bg-[#fff4ec] px-4 py-2 text-sm font-semibold text-[#b4571c]">
                      Mijozlar fikri
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {testimonials.map((testimonial) => (
                      <div key={testimonial.name} className="rounded-[24px] border border-[#e6efe3] bg-[#fcfdfc] p-5">
                        <div className="flex items-center gap-1 text-[#EE7526]">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#35513d]">“{testimonial.quote}”</p>
                        <div className="mt-5">
                          <div className="font-syne text-lg font-bold text-[#254A34]">{testimonial.name}</div>
                          <div className="text-sm text-[#5C7260]">{testimonial.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-surface overflow-hidden p-4 sm:p-5">
                  <img
                    src="/assets/smartcam-outdoor-camera.png"
                    alt="Outdoor SmartCam kamera"
                    className="h-[360px] w-full rounded-[24px] object-cover"
                  />
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="container-shell py-10 sm:py-14">
            <Button
              variant="ghost"
              className="mb-5 rounded-full px-4 text-[#45624d] hover:bg-white"
              onClick={goHome}
            >
              <ChevronLeft className="h-4 w-4" />
              Bosh sahifaga qaytish
            </Button>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge className="rounded-full border-0 bg-[#edf4ec] px-4 py-2 text-sm font-semibold text-[#4A7A5A]">
                  Shaxsiy kabinet
                </Badge>
                <h1 className="mt-4 text-3xl font-extrabold text-[#1A3828] sm:text-4xl">
                  Buyurtmalarim
                </h1>
                <p className="mt-2 text-sm leading-7 text-[#5C7260]">
                  Barcha buyurtmalaringiz holatini shu yerda kuzatasiz.
                </p>
              </div>
              <Button
                className="rounded-full bg-[#EE7526] px-5 text-white hover:bg-[#d8661c]"
                onClick={scrollToCatalog}
              >
                Yana mahsulot tanlash
              </Button>
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
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.18em] text-[#7b927d]">Jami summa</div>
                          <div className="mt-1 text-2xl font-extrabold text-[#254A34]">
                            {formatPrice(Number(order.total_amount))}
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

      <footer className="mt-12 border-t border-white/70 bg-[#1A3828] py-10 text-white">
        <div className="container-shell grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src="/assets/smartcam-logo.png" alt="SmartCam" className="h-11 w-11 rounded-full object-cover" />
              <div>
                <div className="font-syne text-xl font-extrabold">SmartCam</div>
                <div className="text-sm text-white/70">Aqlli kameralar do'koni</div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/70">
              Zamonaviy kuzatuv texnologiyasi, premium servis va ishonchli buyurtma tajribasi.
            </p>
          </div>
          <div>
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Sahifalar</div>
            <div className="space-y-3 text-sm text-white/80">
              <button onClick={goHome} className="block transition hover:text-white">Bosh sahifa</button>
              <button onClick={scrollToCatalog} className="block transition hover:text-white">Katalog</button>
              <button onClick={() => void showOrdersSection()} className="block transition hover:text-white">Buyurtmalarim</button>
            </div>
          </div>
          <div>
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Aloqa</div>
            <div className="space-y-3 text-sm text-white/80">
              <a href="tel:+998901234567" className="block transition hover:text-white">+998 90 123 45 67</a>
              <a href="mailto:info@smartcam.uz" className="block transition hover:text-white">info@smartcam.uz</a>
              <span className="block">Toshkent, O'zbekiston</span>
            </div>
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
                className="h-12 w-full rounded-full bg-[#254A34] text-white hover:bg-[#1A3828]"
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
