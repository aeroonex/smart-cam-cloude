import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronRight, MapPin, Pencil, Truck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { useProducts } from "@/hooks/useProducts";
import { useSessionContext } from "@/components/session-context-provider";
import { useCurrency } from "@/hooks/useCurrency";
import { usePromoCode } from "@/hooks/usePromoCode";
import { regions } from "@/constants";
import type { OrderItem } from "@/lib/format";

type DeliveryProvider = {
  id: string; name: string; company_name: string | null;
  service_fee: number; is_active: boolean;
};
type PickupPoint = {
  id: string; name: string; address: string;
  lat: number; lng: number; working_hours: string; phone: string | null;
};
type PayMethod = "cash" | "click" | "payme" | "alif" | "uzum";

const PAY_METHODS: { id: PayMethod; label: string; emoji: string }[] = [
  { id: "cash",  label: "Naqd pul",    emoji: "💵" },
  { id: "click", label: "Click",       emoji: "⚡" },
  { id: "payme", label: "Payme",       emoji: "💳" },
  { id: "alif",  label: "Alif Nasiya", emoji: "🏦" },
  { id: "uzum",  label: "Uzum Bank",   emoji: "🍇" },
];

export default function OrderPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useSessionContext();
  const { format } = useCurrency();
  const { products } = useProducts();
  const { form, setForm, profile, upsertForOrder } = useProfile(user);
  const { cashbackBalance } = useWallet(user);

  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<PickupPoint | null>(null);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [addressDetail, setAddressDetail] = useState("");
  const [placing, setPlacing] = useState(false);
  const { applied: promoApplied, applyCode: applyPromo, remove: removePromo, markUsed } = usePromoCode();
  const orderPlacedRef = useRef(false);

  // Sheet states
  const [addressSheet, setAddressSheet] = useState(false);
  const [shippingSheet, setShippingSheet] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [pickupSheet, setPickupSheet] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (cart.length === 0 && !orderPlacedRef.current) { navigate("/cart"); return; }
  }, [user, cart.length]);

  useEffect(() => {
    const saved = localStorage.getItem("applied_promo");
    if (saved) applyPromo(saved, cartTotal);
  }, []);

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

  const deliveryFee = (() => {
    if (deliveryType === "pickup") return 0;
    if (!selectedProvider) return null;
    return providers.find(p => p.id === selectedProvider)?.service_fee ?? 0;
  })();

  const promoDiscount = promoApplied?.discountAmount ?? 0;
  const finalTotal = deliveryFee != null ? Math.max(0, cartTotal + deliveryFee - promoDiscount) : null;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  async function placeOrder() {
    if (!user) return;
    if (!form.full_name?.trim() || !form.phone?.trim() || !form.region) {
      toast.error("Ism, telefon va viloyatni kiriting");
      setAddressSheet(true); return;
    }
    if (deliveryType === "delivery" && !addressDetail.trim()) {
      toast.error("Aniq manzilni kiriting"); return;
    }
    if (deliveryType === "delivery" && providers.length > 0 && !selectedProvider) {
      toast.error("Yetkazib beruvchini tanlang"); return;
    }
    if (deliveryType === "pickup" && !selectedPickup) {
      toast.error("Olib ketish nuqtasini tanlang"); return;
    }

    setPlacing(true);
    await upsertForOrder(user);

    const orderItems: OrderItem[] = cart.map(item => ({
      product_id: item.id, product_name: item.name, price: item.price, quantity: item.qty,
    }));

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      items: orderItems,
      total_amount: finalTotal ?? cartTotal,
      status: "yangi",
      payment_status: "unpaid",
      customer_name: form.full_name,
      customer_phone: form.phone,
      customer_region: form.region,
      notes: form.notes || null,
      payment_method: payMethod,
      order_delivery_fee: deliveryFee ?? 0,
      address_detail: deliveryType === "pickup"
        ? `OLIB KETISH: ${selectedPickup?.name} — ${selectedPickup?.address}`
        : addressDetail || null,
    } as never).select("*").single();

    if (error) { toast.error("Buyurtma yuborilmadi"); setPlacing(false); return; }

    if (promoApplied) {
      await markUsed(promoApplied.code.code);
      localStorage.removeItem("applied_promo");
    }

    const totalCashback = cart.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.id);
      return sum + (p?.cashback_amount ?? 0) * item.qty;
    }, 0);
    if (totalCashback > 0) {
      await supabase.from("users").update({ cashback_balance: cashbackBalance + totalCashback }).eq("id", user.id);
    }

    orderPlacedRef.current = true;
    clearCart();
    setPlacing(false);
    const orderNum = (order as { order_number?: number }).order_number;
    const successParam = orderNum ? `HB-${String(orderNum).padStart(6, "0")}` : order.id;
    navigate(`/orders?success=${successParam}`);
  }

  if (!user || cart.length === 0) return null;

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const currentPay = PAY_METHODS.find(m => m.id === payMethod);

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F7F8FA" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <h1 className="text-[20px] font-extrabold text-neutral-900">Checkout</h1>
        </div>
        <button className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-neutral-600">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* ── Shipping Address ── */}
        <section>
          <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">Shipping Address</h2>
          <button onClick={() => setAddressSheet(true)}
            className="w-full bg-white rounded-3xl p-4 flex items-center gap-3 active:bg-neutral-50 transition text-left"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="h-11 w-11 rounded-2xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-neutral-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                {form.region || "Manzil tanlang"}
                {form.region && profile?.phone && (
                  <span className="text-[11px] font-medium text-neutral-400 bg-[#F5F5F5] rounded-full px-2 py-0.5">Asosiy</span>
                )}
              </p>
              <p className="text-[12px] text-neutral-400 mt-0.5 truncate">
                {addressDetail || form.phone || "Manzilni kiriting"}
              </p>
            </div>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[#F5F5F5] shrink-0">
              <Pencil className="h-3.5 w-3.5 text-neutral-500" />
            </div>
          </button>
        </section>

        {/* ── Delivery type ── */}
        <div className="flex gap-2">
          {[
            { id: "delivery" as const, label: "Yetkazib berish", icon: "🚚" },
            { id: "pickup" as const, label: "Olib ketish", icon: "🏪" },
          ].map(opt => (
            <button key={opt.id} onClick={() => setDeliveryType(opt.id)}
              className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 text-[12px] font-semibold transition border-2 ${
                deliveryType === opt.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500"
              }`}>
              <span className="text-[18px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Order List ── */}
        <section>
          <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">Order List</h2>
          <div className="bg-white rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            {cart.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <div className="mx-4 h-px bg-neutral-100" />}
                <div className="flex gap-3 px-4 py-3.5 items-center">
                  <div className="h-[64px] w-[64px] shrink-0 rounded-2xl overflow-hidden bg-[#F5F5F5]">
                    <img src={item.image ?? "/placeholder.svg"} alt={item.name}
                      onError={e => { e.currentTarget.src = "/placeholder.svg"; }}
                      className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-900 line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-[13px] font-extrabold text-neutral-900 mt-1">{format(item.price)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-extrabold text-neutral-900">{item.qty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Choose Shipping ── */}
        {deliveryType === "delivery" && (
          <section>
            <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">Choose Shipping</h2>
            <button onClick={() => setShippingSheet(true)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-neutral-50 transition"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
                <Truck className="h-[18px] w-[18px] text-neutral-600" />
              </div>
              <span className="flex-1 text-[14px] text-neutral-500 text-left">
                {currentProvider ? `${currentProvider.name} · ${currentProvider.service_fee === 0 ? "Bepul" : format(currentProvider.service_fee)}` : "Choose Shipping Type"}
              </span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </button>
          </section>
        )}

        {/* ── Pickup point ── */}
        {deliveryType === "pickup" && (
          <section>
            <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">Olib ketish nuqtasi</h2>
            <button onClick={() => setPickupSheet(true)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-neutral-50 transition"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
                <MapPin className="h-[18px] w-[18px] text-neutral-600" />
              </div>
              <span className="flex-1 text-[14px] text-neutral-500 text-left">
                {selectedPickup ? selectedPickup.name : "Nuqtani tanlang"}
              </span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </button>
          </section>
        )}

        {/* ── Payment method ── */}
        <section>
          <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">To'lov usuli</h2>
          <button onClick={() => setPaySheet(true)}
            className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-neutral-50 transition"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <span className="text-[22px]">{currentPay?.emoji ?? "💵"}</span>
            <span className="flex-1 text-[14px] font-medium text-neutral-800 text-left">{currentPay?.label ?? "Naqd pul"}</span>
            <ChevronRight className="h-4 w-4 text-neutral-300" />
          </button>
        </section>

        {/* ── Promo Code ── */}
        {promoApplied && (
          <section>
            <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">Promo-kod</h2>
            <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-neutral-900">{promoApplied.code.code}</p>
                  <p className="text-[11px] text-green-600 font-semibold">−{format(promoApplied.discountAmount)} chegirma</p>
                </div>
              </div>
              <button onClick={() => { removePromo(); localStorage.removeItem("applied_promo"); }}
                className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center active:scale-90 transition">
                <X className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            </div>
          </section>
        )}

        {/* ── Summary ── */}
        <div className="bg-white rounded-3xl px-4 py-4 space-y-3"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div className="flex justify-between text-[14px]">
            <span className="text-neutral-400">Amount</span>
            <span className="font-semibold text-neutral-800">{format(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-neutral-400">Yetkazib berish</span>
            <span className="font-semibold text-neutral-600">
              {deliveryFee === null ? "—" : deliveryFee === 0 ? "Bepul" : format(deliveryFee)}
            </span>
          </div>
          {promoApplied && (
            <div className="flex justify-between text-[14px]">
              <span className="text-green-600">Chegirma ({promoApplied.code.code})</span>
              <span className="font-semibold text-green-600">−{format(promoApplied.discountAmount)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-[16px] font-extrabold text-neutral-900">Total</span>
            <span className="text-[20px] font-extrabold text-neutral-900">
              {finalTotal != null ? format(finalTotal) : "—"}
            </span>
          </div>
        </div>

        <div className="h-2" />
      </div>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 px-4 py-3"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div className="max-w-lg mx-auto">
          <button onClick={placeOrder} disabled={placing}
            className="w-full h-13 rounded-2xl bg-neutral-900 flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-60 py-3.5">
            <span className="text-[15px] font-bold text-white">
              {placing ? "Yuborilmoqda…" : "Continue to Payment"}
            </span>
            {!placing && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-4 w-4">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Address Sheet ── */}
      {addressSheet && (
        <Sheet onClose={() => setAddressSheet(false)} title="Yetkazish manzili">
          <div className="space-y-3">
            {[
              { label: "Ism-familiya", key: "full_name", placeholder: "Alisher Karimov", type: "text" },
              { label: "Telefon", key: "phone", placeholder: "+998 90 123 45 67", type: "tel" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[12px] font-semibold text-neutral-400 mb-1.5">{f.label}</label>
                <input
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  type={f.type}
                  className="w-full h-12 rounded-2xl bg-[#F5F5F5] px-4 text-[14px] text-neutral-800 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-[12px] font-semibold text-neutral-400 mb-1.5">Viloyat</label>
              <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
                className="w-full h-12 rounded-2xl bg-[#F5F5F5] px-4 text-[14px] text-neutral-700 focus:outline-none">
                <option value="">Hududni tanlang</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-neutral-400 mb-1.5">Ko'cha, uy, kvartira</label>
              <input
                value={addressDetail}
                onChange={e => setAddressDetail(e.target.value)}
                placeholder="Ko'cha, uy, kvartira raqami"
                className="w-full h-12 rounded-2xl bg-[#F5F5F5] px-4 text-[14px] text-neutral-800 focus:outline-none"
              />
            </div>
            <button onClick={() => setAddressSheet(false)}
              className="w-full h-12 rounded-2xl bg-neutral-900 text-white font-bold text-[14px] active:scale-[0.98] transition mt-2">
              Apply
            </button>
          </div>
        </Sheet>
      )}

      {/* ── Shipping Sheet ── */}
      {shippingSheet && providers.length > 0 && (
        <Sheet onClose={() => setShippingSheet(false)} title="Yetkazib beruvchi">
          <div className="space-y-2">
            {providers.map(p => (
              <button key={p.id} onClick={() => { setSelectedProvider(p.id); setShippingSheet(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition ${selectedProvider === p.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-100 bg-white"}`}>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-neutral-900">{p.name}</p>
                  <p className="text-[12px] text-neutral-400">{p.service_fee === 0 ? "Bepul" : format(p.service_fee)}</p>
                </div>
                {selectedProvider === p.id && <Check className="h-4 w-4 text-neutral-900" />}
              </button>
            ))}
            {providers.length === 0 && (
              <p className="text-center text-neutral-400 py-4 text-[14px]">Hozircha yetkazib beruvchilar yo'q</p>
            )}
          </div>
        </Sheet>
      )}

      {/* ── Pickup Sheet ── */}
      {pickupSheet && (
        <Sheet onClose={() => setPickupSheet(false)} title="Olib ketish nuqtasi">
          <div className="space-y-2">
            {pickupPoints.map(p => (
              <button key={p.id} onClick={() => { setSelectedPickup(p); setPickupSheet(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 transition text-left ${selectedPickup?.id === p.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-100 bg-white"}`}>
                <MapPin className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-neutral-900">{p.name}</p>
                  <p className="text-[12px] text-neutral-400">{p.address}</p>
                  <p className="text-[11px] text-neutral-300 mt-0.5">{p.working_hours}</p>
                </div>
                {selectedPickup?.id === p.id && <Check className="h-4 w-4 text-neutral-900 shrink-0 mt-0.5" />}
              </button>
            ))}
            {pickupPoints.length === 0 && (
              <p className="text-center text-neutral-400 py-4 text-[14px]">Nuqtalar yo'q</p>
            )}
          </div>
        </Sheet>
      )}

      {/* ── Payment Sheet ── */}
      {paySheet && (
        <Sheet onClose={() => setPaySheet(false)} title="To'lov usuli">
          <div className="space-y-2">
            {PAY_METHODS.map(m => (
              <button key={m.id} onClick={() => { setPayMethod(m.id); setPaySheet(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition ${payMethod === m.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-100 bg-white"}`}>
                <span className="text-[22px]">{m.emoji}</span>
                <span className="flex-1 text-[14px] font-semibold text-neutral-900 text-left">{m.label}</span>
                {payMethod === m.id && <Check className="h-4 w-4 text-neutral-900" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10"
        style={{ animation: "slidein .28s cubic-bezier(.22,1,.36,1)", maxHeight: "85vh", overflowY: "auto" }}>
        <style>{`@keyframes slidein{from{transform:translateY(100%)}to{transform:none}}`}</style>
        <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-extrabold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
