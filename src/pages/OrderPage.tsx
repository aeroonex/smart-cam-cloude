import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Check, ChevronRight, MapPin, Package,
  Phone, Truck, User, Calendar, Clock, Store,
  CreditCard, Banknote, Smartphone, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { useProducts } from "@/hooks/useProducts";
import { useSessionContext } from "@/components/session-context-provider";
import { useCurrency } from "@/hooks/useCurrency";
import { regions } from "@/constants";
import type { OrderItem } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────
type DeliveryProvider = {
  id: string; name: string; company_name: string | null;
  service_fee: number; is_active: boolean;
};
type PickupPoint = {
  id: string; name: string; address: string;
  lat: number; lng: number; working_hours: string; phone: string | null;
};
type DeliveryType = "delivery" | "pickup";
type PayMethod = "cash" | "click" | "payme" | "alif" | "uzum";
type Step = "profile" | "delivery" | "payment" | "confirm";

// ── Constants ─────────────────────────────────────────────────────────────
const PAY_METHODS: { id: PayMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "cash",  label: "Naqd pul",  icon: <Banknote  className="h-5 w-5" />, hint: "Yetkazib berganda to'lang" },
  { id: "click", label: "Click",    icon: <Smartphone className="h-5 w-5" />, hint: "Click ilovasi orqali" },
  { id: "payme", label: "Payme",    icon: <Smartphone className="h-5 w-5" />, hint: "Payme ilovasi orqali" },
  { id: "alif",  label: "Alif Nasiya", icon: <CreditCard className="h-5 w-5" />, hint: "6–12 oylik muddatli to'lov" },
  { id: "uzum",  label: "Uzum Bank", icon: <CreditCard className="h-5 w-5" />, hint: "Uzum Bank orqali" },
];

const DELIVERY_DATES = (() => {
  const days = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return {
      label: `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`,
      value: d.toISOString().split("T")[0],
      isToday: false,
    };
  });
})();

// ── Lazy-load Leaflet only on client ──────────────────────────────────────
let MapComponent: React.FC<{
  pickupPoints: PickupPoint[];
  selectedId: string | null;
  onSelect: (p: PickupPoint) => void;
  userLat?: number | null;
  userLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  onDeliveryPin?: (lat: number, lng: number) => void;
  mode: "pickup" | "delivery";
}> | null = null;

function LazyMap(props: Parameters<NonNullable<typeof MapComponent>>[0]) {
  const [Comp, setComp] = useState<typeof MapComponent>(null);
  useEffect(() => {
    if (Comp) return;
    import("@/components/OrderMap").then(m => setComp(() => m.OrderMap));
  }, [Comp]);
  if (!Comp) return (
    <div className="flex items-center justify-center h-full bg-slate-100 rounded-2xl">
      <span className="text-sm text-slate-400">Xarita yuklanmoqda…</span>
    </div>
  );
  return <Comp {...props} />;
}

// ── Main component ────────────────────────────────────────────────────────
export default function OrderPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useSessionContext();
  const { format } = useCurrency();
  const { products } = useProducts();
  const { form, setForm, profile, upsertForOrder } = useProfile(user);
  const { cashbackBalance } = useWallet(user);

  const [step, setStep] = useState<Step>("profile");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<PickupPoint | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(DELIVERY_DATES[0].value);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("09:00–13:00");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Profile completion check
  const profileIncomplete = !form.full_name || !form.phone || !form.region;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (cart.length === 0) { navigate("/cart"); return; }
  }, [user, cart.length, navigate]);

  useEffect(() => {
    if (profile && !profileIncomplete && step === "profile") setStep("delivery");
  }, [profile, profileIncomplete, step]);

  useEffect(() => {
    supabase.from("delivery_providers" as never)
      .select("*").eq("is_active", true)
      .then(({ data }: { data: DeliveryProvider[] | null }) => {
        const list = (data ?? []) as DeliveryProvider[];
        setProviders(list);
        if (list.length === 1) setSelectedProvider(list[0].id);
      });

    supabase.from("pickup_points" as never)
      .select("*").eq("is_active", true)
      .then(({ data }: { data: PickupPoint[] | null }) => {
        setPickupPoints((data ?? []) as PickupPoint[]);
      });
  }, []);

  // Delivery fee
  const cartDeliveryFee = (() => {
    if (deliveryType === "pickup") return 0;
    if (!selectedProvider) return 0;
    const p = providers.find(p => p.id === selectedProvider);
    return p?.service_fee ?? 0;
  })();

  const finalTotal = cartTotal + cartDeliveryFee;

  // ── Save profile ──────────────────────────────────────────────────────
  async function saveProfile() {
    if (!form.full_name.trim() || !form.phone.trim() || !form.region) {
      toast.error("Ism, telefon va viloyatni kiriting"); return;
    }
    setProfileSaving(true);
    const { error } = await supabase.from("users")
      .update({ full_name: form.full_name, phone: form.phone, region: form.region })
      .eq("id", user!.id);
    setProfileSaving(false);
    if (error) { toast.error("Saqlab bo'lmadi"); return; }
    toast.success("Profil saqlandi");
    setStep("delivery");
  }

  // ── Place order ───────────────────────────────────────────────────────
  async function placeOrder() {
    if (!user) return;
    if (!form.full_name || !form.phone || !form.region) {
      toast.error("Profil ma'lumotlari to'liq emas"); setStep("profile"); return;
    }
    if (deliveryType === "delivery" && !selectedProvider) {
      toast.error("Yetkazib beruvchini tanlang"); setStep("delivery"); return;
    }
    if (deliveryType === "pickup" && !selectedPickup) {
      toast.error("Olib ketish nuqtasini tanlang"); setStep("delivery"); return;
    }

    setPlacing(true);
    await upsertForOrder(user);

    const orderItems: OrderItem[] = cart.map(item => ({
      product_id: item.id, product_name: item.name, price: item.price, quantity: item.qty,
    }));

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      items: orderItems,
      total_amount: finalTotal,
      status: "yangi",
      payment_status: "unpaid",
      customer_name: form.full_name,
      customer_phone: form.phone,
      customer_region: form.region,
      notes: form.notes || null,
      payment_method: payMethod,
      order_delivery_fee: cartDeliveryFee,
      address_detail: deliveryType === "pickup"
        ? `OLIB KETISH: ${selectedPickup?.name} — ${selectedPickup?.address}`
        : addressDetail || null,
      delivery_date: deliveryDate,
    } as never).select("*").single();

    if (error) { toast.error("Buyurtma yuborilmadi. Qayta urinib ko'ring."); setPlacing(false); return; }

    // cashback
    const totalCashback = cart.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.id);
      return sum + (p?.cashback_amount ?? 0) * item.qty;
    }, 0);
    if (totalCashback > 0) {
      await supabase.from("users").update({ cashback_balance: cashbackBalance + totalCashback }).eq("id", user.id);
      toast.success(`+${totalCashback.toLocaleString()} so'm cashback!`);
    }

    clearCart();
    setPlacing(false);
    navigate(`/orders?success=${order.id}`);
  }

  if (!user || cart.length === 0) return null;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => step === "profile" ? navigate("/cart") : setStep(
              step === "delivery" ? "profile" : step === "payment" ? "delivery" : "payment"
            )}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 active:scale-95 transition"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-slate-900">Buyurtma rasmiylashtirish</p>
            <p className="text-[11px] text-slate-400">{totalQty} ta mahsulot · {format(finalTotal)}</p>
          </div>
          {/* Steps indicator */}
          <div className="flex gap-1">
            {(["profile","delivery","payment","confirm"] as Step[]).map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-6 bg-[#1d4f8a]" : i < (["profile","delivery","payment","confirm"] as Step[]).indexOf(step) ? "w-3 bg-[#1d4f8a]/40" : "w-3 bg-slate-200"
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-32">

        {/* ── STEP 1: Profile ────────────────────────────────────────── */}
        {step === "profile" && (
          <div className="px-4 pt-6 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-[#1d4f8a]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#1d4f8a]" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Shaxsiy ma'lumotlar</p>
                  <p className="text-[12px] text-slate-400">Yetkazib berish uchun kerak</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-slate-500 mb-1 block">Ism va familiya *</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Masalan: Alisher Karimov"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a] transition"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-slate-500 mb-1 block">Telefon raqam *</label>
                  <div className="flex gap-2">
                    <div className="h-12 px-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-500 shrink-0">
                      🇺🇿 +998
                    </div>
                    <input
                      value={form.phone.replace("+998", "").replace(/\s/g, "")}
                      onChange={e => setForm(p => ({ ...p, phone: "+998" + e.target.value.replace(/\D/g, "") }))}
                      placeholder="90 123 45 67"
                      inputMode="numeric"
                      className="flex-1 h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a] transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-slate-500 mb-1 block">Viloyat / shahar *</label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a] transition appearance-none"
                    >
                      <option value="">Tanlang…</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Delivery ───────────────────────────────────────── */}
        {step === "delivery" && (
          <div className="px-4 pt-6 space-y-4">

            {/* Delivery type */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-slate-900 mb-4">Yetkazib berish usuli</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "delivery" as DeliveryType, label: "Yetkazib berish", icon: <Truck className="h-6 w-6" />, hint: "Eshigingizgacha" },
                  { id: "pickup" as DeliveryType, label: "Olib ketish", icon: <Store className="h-6 w-6" />, hint: "Bizning nuqtamizdan" },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDeliveryType(opt.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
                      deliveryType === opt.id
                        ? "border-[#1d4f8a] bg-[#1d4f8a]/5"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {deliveryType === opt.id && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#1d4f8a] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className={`${deliveryType === opt.id ? "text-[#1d4f8a]" : "text-slate-400"}`}>
                      {opt.icon}
                    </div>
                    <p className={`text-[13px] font-bold ${deliveryType === opt.id ? "text-[#1d4f8a]" : "text-slate-700"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-slate-400">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery provider (only for home delivery) */}
            {deliveryType === "delivery" && providers.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#1d4f8a]" /> Yetkazib beruvchi
                </p>
                <div className="space-y-2">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                        selectedProvider === p.id
                          ? "border-[#1d4f8a] bg-[#1d4f8a]/5"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${selectedProvider === p.id ? "bg-[#1d4f8a]" : "bg-slate-200"}`}>
                          <Truck className={`h-4 w-4 ${selectedProvider === p.id ? "text-white" : "text-slate-500"}`} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-[13px] text-slate-900">{p.name}</p>
                          {p.company_name && <p className="text-[11px] text-slate-400">{p.company_name}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-[13px] ${selectedProvider === p.id ? "text-[#1d4f8a]" : "text-slate-700"}`}>
                          {p.service_fee === 0 ? "Bepul" : `+${format(p.service_fee)}`}
                        </p>
                        {selectedProvider === p.id && (
                          <Check className="h-4 w-4 text-[#1d4f8a] ml-auto mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Address for home delivery */}
            {deliveryType === "delivery" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#1d4f8a]" /> Yetkazish manzili
                </p>
                <input
                  value={addressDetail}
                  onChange={e => setAddressDetail(e.target.value)}
                  placeholder="Ko'cha, uy, kvartira raqami…"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a] transition mb-3"
                />
                {/* Map: click to pin delivery address */}
                <div className="h-48 rounded-2xl overflow-hidden">
                  <LazyMap
                    mode="delivery"
                    pickupPoints={[]}
                    selectedId={null}
                    onSelect={() => {}}
                    deliveryLat={deliveryLat}
                    deliveryLng={deliveryLng}
                    onDeliveryPin={(lat, lng) => {
                      setDeliveryLat(lat);
                      setDeliveryLng(lng);
                    }}
                  />
                </div>
                {deliveryLat && (
                  <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Xaritada belgilandi
                  </p>
                )}
              </div>
            )}

            {/* Pickup map */}
            {deliveryType === "pickup" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#1d4f8a]" /> Olib ketish nuqtasi
                </p>
                <p className="text-[12px] text-slate-400 mb-4">Xaritadan nuqtani tanlang</p>

                {/* Map */}
                <div className="h-56 rounded-2xl overflow-hidden mb-4">
                  <LazyMap
                    mode="pickup"
                    pickupPoints={pickupPoints}
                    selectedId={selectedPickup?.id ?? null}
                    onSelect={p => setSelectedPickup(p)}
                  />
                </div>

                {/* Pickup points list */}
                <div className="space-y-2">
                  {pickupPoints.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPickup(p)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition text-left ${
                        selectedPickup?.id === p.id
                          ? "border-[#1d4f8a] bg-[#1d4f8a]/5"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${selectedPickup?.id === p.id ? "bg-[#1d4f8a]" : "bg-slate-200"}`}>
                        <Store className={`h-4 w-4 ${selectedPickup?.id === p.id ? "text-white" : "text-slate-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.address}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {p.working_hours}
                          </span>
                          {p.phone && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {p.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedPickup?.id === p.id && (
                        <Check className="h-4 w-4 text-[#1d4f8a] shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery date */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1d4f8a]" />
                {deliveryType === "pickup" ? "Olib ketish sanasi" : "Yetkazish sanasi"}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {DELIVERY_DATES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDeliveryDate(d.value)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl border-2 transition text-center min-w-[80px] ${
                      deliveryDate === d.value
                        ? "border-[#1d4f8a] bg-[#1d4f8a] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="text-[12px] font-semibold">{d.label.split(", ")[0]}</p>
                    <p className="text-[13px] font-bold">{d.label.split(", ")[1]}</p>
                  </button>
                ))}
              </div>
              {/* Time slot */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {["09:00–13:00", "13:00–17:00", "17:00–21:00"].map(t => (
                  <button
                    key={t}
                    onClick={() => setDeliveryTimeSlot(t)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition flex items-center gap-1.5 ${
                      deliveryTimeSlot === t
                        ? "border-[#1d4f8a] bg-[#1d4f8a]/10 text-[#1d4f8a]"
                        : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    <Clock className="h-3 w-3" /> {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ────────────────────────────────────────── */}
        {step === "payment" && (
          <div className="px-4 pt-6 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#1d4f8a]" /> To'lov usuli
              </p>
              <div className="space-y-2">
                {PAY_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                      payMethod === m.id
                        ? "border-[#1d4f8a] bg-[#1d4f8a]/5"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${payMethod === m.id ? "bg-[#1d4f8a] text-white" : "bg-slate-200 text-slate-500"}`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[14px] text-slate-900">{m.label}</p>
                      <p className="text-[11px] text-slate-400">{m.hint}</p>
                    </div>
                    {payMethod === m.id && (
                      <div className="h-6 w-6 rounded-full bg-[#1d4f8a] flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-slate-900 mb-3">Qo'shimcha izoh</p>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Kuryer uchun izoh, qo'ng'iroq qilmasdan keling va h.k."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/30 focus:border-[#1d4f8a] transition resize-none"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirm ────────────────────────────────────────── */}
        {step === "confirm" && (
          <div className="px-4 pt-6 space-y-4">
            {/* Cart items */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-[#1d4f8a]" /> Buyurtma tarkibi
              </p>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={item.image ?? "/placeholder.svg"} alt={item.name}
                        onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                        className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.qty} × {format(item.price)}</p>
                    </div>
                    <p className="font-bold text-[13px] text-slate-900 shrink-0">{format(item.price * item.qty)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="font-bold text-slate-900">Buyurtma xulosasi</p>
              <Row label={`Mahsulotlar (${totalQty} ta)`} value={format(cartTotal)} />
              <Row
                label="Yetkazib berish"
                value={cartDeliveryFee === 0 ? "Bepul" : format(cartDeliveryFee)}
                valueClass={cartDeliveryFee === 0 ? "text-emerald-600" : ""}
              />
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <p className="font-bold text-[15px] text-slate-900">Jami</p>
                <p className="font-extrabold text-[18px] text-[#1d4f8a]">{format(finalTotal)}</p>
              </div>
            </div>

            {/* Details recap */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="font-bold text-slate-900">Yetkazish tafsiloti</p>
              <DetailRow icon={<User className="h-4 w-4" />} label={form.full_name} sub={form.phone} />
              <DetailRow
                icon={deliveryType === "pickup" ? <Store className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                label={deliveryType === "pickup" ? (selectedPickup?.name ?? "") : (addressDetail || form.region)}
                sub={deliveryType === "pickup" ? selectedPickup?.address : form.region}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label={DELIVERY_DATES.find(d => d.value === deliveryDate)?.label ?? deliveryDate}
                sub={deliveryTimeSlot}
              />
              <DetailRow
                icon={<CreditCard className="h-4 w-4" />}
                label={PAY_METHODS.find(m => m.id === payMethod)?.label ?? payMethod}
                sub=""
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          {step === "profile" && (
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="w-full h-14 rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              {profileSaving ? "Saqlanmoqda…" : "Davom etish"}
              {!profileSaving && <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {step === "delivery" && (
            <button
              onClick={() => {
                if (deliveryType === "delivery" && providers.length > 0 && !selectedProvider) {
                  toast.error("Yetkazib beruvchini tanlang"); return;
                }
                if (deliveryType === "pickup" && !selectedPickup) {
                  toast.error("Olib ketish nuqtasini tanlang"); return;
                }
                setStep("payment");
              }}
              className="w-full h-14 rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              To'lov usuliga o'tish <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {step === "payment" && (
            <button
              onClick={() => setStep("confirm")}
              className="w-full h-14 rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              Buyurtmani ko'rib chiqish <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {step === "confirm" && (
            <div className="space-y-2">
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)" }}
              >
                {placing ? "Yuborilmoqda…" : `Buyurtma berish · ${format(finalTotal)}`}
                {!placing && <Check className="h-5 w-5" />}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Buyurtma bergandan so'ng kuryer siz bilan bog'lanadi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────
function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold text-slate-800 ${valueClass}`}>{value}</span>
    </div>
  );
}
function DetailRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#1d4f8a] shrink-0">{icon}</div>
      <div>
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
