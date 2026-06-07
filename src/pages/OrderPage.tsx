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
const PAY_METHODS: { id: PayMethod; label: string; emoji: string; hint: string }[] = [
  { id: "cash",  label: "Naqd pul",    emoji: "💵", hint: "Yetkazganda to'lang" },
  { id: "click", label: "Click",       emoji: "⚡", hint: "Click ilovasi" },
  { id: "payme", label: "Payme",       emoji: "💳", hint: "Payme ilovasi" },
  { id: "alif",  label: "Alif Nasiya", emoji: "🏦", hint: "Muddatli to'lov" },
  { id: "uzum",  label: "Uzum Bank",   emoji: "🍇", hint: "Uzum Bank" },
];

const DELIVERY_DATES = (() => {
  const days = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return {
      label: `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`,
      value: d.toISOString().split("T")[0],
    };
  });
})();

const TIME_SLOTS = ["09:00–13:00", "13:00–17:00", "17:00–21:00"];

// ── Lazy-load Leaflet ──────────────────────────────────────────────────────
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

// ── Neumorphic Radio Group ────────────────────────────────────────────────
function RadioGroup<T extends string>({
  options, value, onChange, cols = 3,
}: {
  options: { id: T; label: string; sub?: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <>
      <style>{`
        .neu-inputs {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          border-radius: 1rem;
          background: linear-gradient(145deg, #e8eaf0, #f5f6fa);
          box-shadow: 5px 5px 15px rgba(0,0,0,0.10), -5px -5px 15px rgba(255,255,255,0.85);
          padding: 0.4rem;
          gap: 0.35rem;
          width: 100%;
        }
        .neu-radio { flex: 1 1 auto; text-align: center; min-width: 0; }
        .neu-radio input { display: none; }
        .neu-name {
          display: flex; flex-direction: column;
          cursor: pointer; align-items: center; justify-content: center;
          border-radius: 0.65rem; border: none;
          padding: 0.6rem 0.4rem;
          color: #374151; font-weight: 500; font-family: inherit;
          background: linear-gradient(145deg, #ffffff, #e8eaf0);
          box-shadow: 3px 3px 6px rgba(0,0,0,0.09), -3px -3px 6px rgba(255,255,255,0.75);
          transition: all 0.2s ease;
          overflow: hidden; position: relative;
          font-size: 13px; line-height: 1.3;
          white-space: nowrap;
        }
        .neu-radio input:checked + .neu-name {
          background: linear-gradient(145deg, #1d4f8a, #2d6bb5);
          color: white; font-weight: 600;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.22), inset -2px -2px 5px rgba(255,255,255,0.08), 3px 3px 8px rgba(29,79,138,0.28);
          transform: translateY(1px);
          animation: neu-select 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .neu-radio:hover .neu-name {
          background: linear-gradient(145deg, #f3f4f6, #ffffff);
          transform: translateY(-1px);
          box-shadow: 4px 4px 8px rgba(0,0,0,0.09), -4px -4px 8px rgba(255,255,255,0.8);
        }
        .neu-radio:hover input:checked + .neu-name { transform: translateY(1px); }
        @keyframes neu-select {
          0%   { transform: scale(0.95) translateY(1px); }
          50%  { transform: scale(1.04) translateY(-1px); }
          100% { transform: scale(1) translateY(1px); }
        }
        .neu-name .neu-sub {
          font-size: 10px; opacity: 0.65; font-weight: 400;
          margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
        }
        .neu-radio input:checked + .neu-name .neu-sub { opacity: 0.75; }
      `}</style>
      <div className="neu-inputs" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map(opt => (
          <label key={opt.id} className="neu-radio">
            <input
              type="radio"
              name={`rg-${options.map(o => o.id).join("")}`}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
            />
            <span className="neu-name">
              {opt.emoji && <span style={{ fontSize: 18, lineHeight: 1.2 }}>{opt.emoji}</span>}
              {opt.label}
              {opt.sub && <span className="neu-sub">{opt.sub}</span>}
            </span>
          </label>
        ))}
      </div>
    </>
  );
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
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(TIME_SLOTS[0]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const orderPlacedRef = useRef(false);

  const profileIncomplete = !form.full_name || !form.phone || !form.region;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (cart.length === 0 && !orderPlacedRef.current) { navigate("/cart"); return; }
  }, [user, cart.length, navigate]);

  const autoAdvancedRef = useRef(false);
  useEffect(() => {
    if (autoAdvancedRef.current) return;
    if (profile && !profileIncomplete && step === "profile") {
      autoAdvancedRef.current = true;
      setStep("delivery");
    }
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

  const cartDeliveryFee = (() => {
    if (deliveryType === "pickup") return 0;
    if (!selectedProvider) return 0;
    const p = providers.find(p => p.id === selectedProvider);
    return p?.service_fee ?? 0;
  })();

  const finalTotal = cartTotal + cartDeliveryFee;

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
      delivery_time_slot: deliveryTimeSlot,
    } as never).select("*").single();

    if (error) { toast.error("Buyurtma yuborilmadi. Qayta urinib ko'ring."); setPlacing(false); return; }

    const totalCashback = cart.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.id);
      return sum + (p?.cashback_amount ?? 0) * item.qty;
    }, 0);
    if (totalCashback > 0) {
      await supabase.from("users").update({ cashback_balance: cashbackBalance + totalCashback }).eq("id", user.id);
      toast.success(`+${totalCashback.toLocaleString()} so'm cashback!`);
    }

    orderPlacedRef.current = true;
    clearCart();
    setPlacing(false);
    // Pass HB-XXXXXX formatted number if available, else UUID
    const orderNum = (order as { order_number?: number }).order_number;
    const successParam = orderNum ? `HB-${String(orderNum).padStart(6, "0")}` : order.id;
    navigate(`/orders?success=${successParam}`);
  }

  if (!user || cart.length === 0) return null;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const STEPS_LIST: Step[] = ["profile", "delivery", "payment", "confirm"];
  const stepIdx = STEPS_LIST.indexOf(step);

  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => step === "profile" ? navigate("/cart") : setStep(
              STEPS_LIST[stepIdx - 1] ?? "profile"
            )}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 active:scale-95 transition"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] text-slate-900 truncate">Buyurtma rasmiylashtirish</p>
            <p className="text-[10px] text-slate-400">{totalQty} ta mahsulot · {format(finalTotal)}</p>
          </div>
          {/* Steps dots */}
          <div className="flex gap-1 shrink-0">
            {STEPS_LIST.map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-6 bg-[#1d4f8a]"
                : i < stepIdx ? "w-3 bg-[#1d4f8a]/50"
                : "w-3 bg-slate-200"
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-32">

        {/* ── STEP 1: Profile ──────────────────────────────────────────── */}
        {step === "profile" && (
          <div className="px-4 pt-5 space-y-3">
            <Card icon={<User className="h-4 w-4 text-[#1d4f8a]" />} title="Shaxsiy ma'lumotlar" sub="Yetkazib berish uchun kerak">
              <div className="space-y-2.5 mt-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Ism va familiya *</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Masalan: Alisher Karimov"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/20 focus:border-[#1d4f8a] transition shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Telefon raqam *</label>
                  <div className="flex gap-2">
                    <div className="h-11 px-3 flex items-center rounded-xl border border-slate-200 bg-white text-[13px] text-slate-500 shrink-0 shadow-sm">
                      🇺🇿 +998
                    </div>
                    <input
                      value={form.phone.replace("+998", "").replace(/\s/g, "")}
                      onChange={e => setForm(p => ({ ...p, phone: "+998" + e.target.value.replace(/\D/g, "") }))}
                      placeholder="90 123 45 67"
                      inputMode="numeric"
                      className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/20 focus:border-[#1d4f8a] transition shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Viloyat / shahar *</label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/20 focus:border-[#1d4f8a] transition appearance-none shadow-sm"
                    >
                      <option value="">Tanlang…</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 2: Delivery ─────────────────────────────────────────── */}
        {step === "delivery" && (
          <div className="px-4 pt-5 space-y-3">

            {/* Delivery type */}
            <Card icon={<Truck className="h-4 w-4 text-[#1d4f8a]" />} title="Yetkazib berish usuli">
              <div className="mt-3">
                <RadioGroup
                  value={deliveryType}
                  onChange={setDeliveryType}
                  cols={2}
                  options={[
                    { id: "delivery", label: "Yetkazib berish", emoji: "🚚", sub: "Eshigingizgacha" },
                    { id: "pickup",   label: "Olib ketish",     emoji: "🏪", sub: "Bizning nuqtadan" },
                  ]}
                />
              </div>
            </Card>

            {/* Provider */}
            {deliveryType === "delivery" && providers.length > 0 && (
              <Card icon={<Truck className="h-4 w-4 text-[#1d4f8a]" />} title="Yetkazib beruvchi">
                <div className="mt-3">
                  <RadioGroup
                    value={selectedProvider ?? ""}
                    onChange={setSelectedProvider}
                    cols={providers.length <= 2 ? providers.length : 3}
                    options={providers.map(p => ({
                      id: p.id,
                      label: p.name,
                      sub: p.service_fee === 0 ? "Bepul" : `+${format(p.service_fee)}`,
                    }))}
                  />
                </div>
              </Card>
            )}

            {/* Address */}
            {deliveryType === "delivery" && (
              <Card icon={<MapPin className="h-4 w-4 text-[#1d4f8a]" />} title="Yetkazish manzili">
                <input
                  value={addressDetail}
                  onChange={e => setAddressDetail(e.target.value)}
                  placeholder="Ko'cha, uy, kvartira raqami…"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/20 focus:border-[#1d4f8a] transition shadow-sm mt-3 mb-3"
                />
                <div className="h-44 rounded-xl overflow-hidden">
                  <LazyMap
                    mode="delivery" pickupPoints={[]} selectedId={null} onSelect={() => {}}
                    deliveryLat={deliveryLat} deliveryLng={deliveryLng}
                    onDeliveryPin={(lat, lng) => { setDeliveryLat(lat); setDeliveryLng(lng); }}
                  />
                </div>
                {deliveryLat && (
                  <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Xaritada belgilandi
                  </p>
                )}
              </Card>
            )}

            {/* Pickup points */}
            {deliveryType === "pickup" && (
              <Card icon={<MapPin className="h-4 w-4 text-[#1d4f8a]" />} title="Olib ketish nuqtasi" sub="Xaritadan yoki ro'yxatdan tanlang">
                <div className="h-52 rounded-xl overflow-hidden mt-3 mb-3">
                  <LazyMap
                    mode="pickup" pickupPoints={pickupPoints}
                    selectedId={selectedPickup?.id ?? null}
                    onSelect={p => setSelectedPickup(p)}
                  />
                </div>
                <div className="space-y-2">
                  {pickupPoints.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPickup(p)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition text-left ${
                        selectedPickup?.id === p.id
                          ? "border-[#1d4f8a] bg-[#1d4f8a]/5"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm ${selectedPickup?.id === p.id ? "bg-[#1d4f8a] text-white" : "bg-slate-100 text-slate-400"}`}>
                        🏪
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.address}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {p.working_hours}
                          </span>
                          {p.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                        </div>
                      </div>
                      {selectedPickup?.id === p.id && <Check className="h-4 w-4 text-[#1d4f8a] shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Date */}
            <Card icon={<Calendar className="h-4 w-4 text-[#1d4f8a]" />} title={deliveryType === "pickup" ? "Olib ketish sanasi" : "Yetkazish sanasi"}>
              <div className="mt-3">
                <RadioGroup
                  value={deliveryDate}
                  onChange={setDeliveryDate}
                  cols={4}
                  options={DELIVERY_DATES.map(d => ({
                    id: d.value,
                    label: d.label.split(", ")[1],
                    sub: d.label.split(", ")[0],
                  }))}
                />
              </div>
              {/* Time slot */}
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Vaqt oralig'i</p>
                <RadioGroup
                  value={deliveryTimeSlot}
                  onChange={setDeliveryTimeSlot}
                  cols={3}
                  options={TIME_SLOTS.map(t => ({ id: t, label: t }))}
                />
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 3: Payment ──────────────────────────────────────────── */}
        {step === "payment" && (
          <div className="px-4 pt-5 space-y-3">
            <Card icon={<CreditCard className="h-4 w-4 text-[#1d4f8a]" />} title="To'lov usuli">
              <div className="mt-3">
                <RadioGroup
                  value={payMethod}
                  onChange={setPayMethod}
                  cols={3}
                  options={PAY_METHODS.map(m => ({ id: m.id, label: m.label, emoji: m.emoji, sub: m.hint }))}
                />
              </div>
            </Card>

            <Card icon={<X className="h-4 w-4 text-slate-300" />} title="Qo'shimcha izoh">
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Kuryer uchun izoh, qo'ng'iroq qilmasdan keling va h.k."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]/20 focus:border-[#1d4f8a] transition resize-none shadow-sm mt-3"
              />
            </Card>
          </div>
        )}

        {/* ── STEP 4: Confirm ──────────────────────────────────────────── */}
        {step === "confirm" && (
          <div className="px-4 pt-5 space-y-3">
            {/* Cart items */}
            <Card icon={<Package className="h-4 w-4 text-[#1d4f8a]" />} title="Buyurtma tarkibi">
              <div className="space-y-2.5 mt-3">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-100 shrink-0">
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
            </Card>

            {/* Summary */}
            <Card icon={<CreditCard className="h-4 w-4 text-[#1d4f8a]" />} title="Buyurtma xulosasi">
              <div className="space-y-2 mt-3 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mahsulotlar ({totalQty} ta)</span>
                  <span className="font-semibold text-slate-800">{format(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Yetkazib berish</span>
                  <span className={`font-semibold ${cartDeliveryFee === 0 ? "text-emerald-600" : "text-slate-800"}`}>
                    {cartDeliveryFee === 0 ? "Bepul" : format(cartDeliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <p className="font-bold text-[15px] text-slate-900">Jami</p>
                  <p className="font-extrabold text-[17px] text-[#1d4f8a]">{format(finalTotal)}</p>
                </div>
              </div>
            </Card>

            {/* Details recap */}
            <Card icon={<MapPin className="h-4 w-4 text-[#1d4f8a]" />} title="Yetkazish tafsiloti">
              <div className="space-y-2.5 mt-3">
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
                />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-100 px-4 pt-3 pb-5">
        <div className="max-w-lg mx-auto">
          {step === "profile" && (
            <button onClick={saveProfile} disabled={profileSaving}
              className="w-full h-13 rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 py-3.5">
              {profileSaving ? "Saqlanmoqda…" : <><span>Davom etish</span><ChevronRight className="h-5 w-5" /></>}
            </button>
          )}
          {step === "delivery" && (
            <button
              onClick={() => {
                if (deliveryType === "delivery" && providers.length > 0 && !selectedProvider) { toast.error("Yetkazib beruvchini tanlang"); return; }
                if (deliveryType === "pickup" && !selectedPickup) { toast.error("Olib ketish nuqtasini tanlang"); return; }
                setStep("payment");
              }}
              className="w-full rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition py-3.5">
              To'lov usuliga o'tish <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {step === "payment" && (
            <button onClick={() => setStep("confirm")}
              className="w-full rounded-2xl bg-[#1d4f8a] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition py-3.5">
              Buyurtmani ko'rib chiqish <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {step === "confirm" && (
            <div className="space-y-2">
              <button
                onClick={placeOrder} disabled={placing}
                className="w-full rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 py-3.5"
                style={{ background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)" }}>
                {placing ? "Yuborilmoqda…" : <><span>Buyurtma berish · {format(finalTotal)}</span><Check className="h-5 w-5" /></>}
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

// ── Helpers ───────────────────────────────────────────────────────────────
function Card({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-0.5">
        {icon}
        <p className="font-bold text-[14px] text-slate-900">{title}</p>
      </div>
      {sub && <p className="text-[11px] text-slate-400 ml-6">{sub}</p>}
      {children}
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
