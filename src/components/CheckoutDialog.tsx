import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { regions } from "@/constants";
import { useCurrency } from "@/hooks/useCurrency";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { PromoCodeInput } from "@/components/PromoCodeInput";
import type { CartItem } from "@/hooks/useCart";
import type { CheckoutForm } from "@/hooks/useProfile";

type PaymentMethod = "cash" | "click" | "payme" | "alif" | "uzum";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  form: CheckoutForm;
  onFormChange: (form: CheckoutForm) => void;
  placing: boolean;
  onPlace: (opts: { paymentMethod: PaymentMethod; promoCode?: string; discountAmount: number; deliveryFee: number; addressDetail?: string }) => void;
  deliveryFee?: number;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  cartTotal,
  form,
  onFormChange,
  placing,
  onPlace,
  deliveryFee = 0,
}: Props) {
  const { format: formatPrice } = useCurrency();
  const update =
    (field: keyof CheckoutForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onFormChange({ ...form, [field]: e.target.value });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  const finalTotal = Math.max(0, cartTotal - discountAmount) + deliveryFee;

  function handlePromoApplied(discount: number, code: string) {
    setDiscountAmount(discount);
    setAppliedCode(code);
  }
  function handlePromoRemoved() {
    setDiscountAmount(0);
    setAppliedCode("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl rounded-[30px] border-[#dbe7d8] bg-[#fcfdfc] p-0">
        <DialogHeader className="border-b border-[#e7eee5] px-6 py-5 text-left sticky top-0 bg-[#fcfdfc] z-10">
          <DialogTitle className="font-syne text-xl font-extrabold text-[#1A3828]">
            Buyurtmani tasdiqlash
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5C7260]">
            Ma'lumotlarni kiriting va xaridni yakunlang.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_1.1fr]">
          {/* ── Left: Order summary ── */}
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[#e6efe3] bg-white p-4">
              <h3 className="font-bold text-[#254A34] mb-3">Savat xulosasi</h3>
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-neutral-800">{item.name}</div>
                      <div className="text-neutral-400 text-xs">{item.qty} × {formatPrice(item.price)}</div>
                    </div>
                    <div className="font-semibold text-neutral-800 shrink-0">{formatPrice(item.price * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>Mahsulotlar:</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Promokod:</span>
                    <span>−{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {deliveryFee > 0 ? (
                  <div className="flex justify-between text-neutral-500">
                    <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Yetkazish:</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-600 text-xs font-medium">
                    <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Yetkazish:</span>
                    <span>Bepul</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-100 pt-2 font-extrabold text-neutral-900 text-base">
                  <span>Jami:</span>
                  <span className="text-[#1d4f8a]">{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Promo code */}
            <PromoCodeInput
              cartTotal={cartTotal}
              onApplied={handlePromoApplied}
              onRemoved={handlePromoRemoved}
            />
          </div>

          {/* ── Right: Delivery & payment ── */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#4A7A5A]">Ism-familiya</label>
                <Input value={form.full_name} onChange={update("full_name")}
                  className="h-11 rounded-2xl border-[#dbe7d8]" placeholder="Ism va familiya" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#4A7A5A]">Telefon</label>
                <Input value={form.phone} onChange={update("phone")}
                  className="h-11 rounded-2xl border-[#dbe7d8]" placeholder="+998 90 123 45 67" type="tel" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#4A7A5A]">Viloyat / shahar</label>
                <select value={form.region} onChange={update("region")}
                  className="flex h-11 w-full rounded-2xl border border-[#dbe7d8] bg-white px-4 text-sm outline-none focus:border-[#1d4f8a]">
                  <option value="">Hududni tanlang</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#4A7A5A]">Ko'cha, uy (ixtiyoriy)</label>
                <Input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
                  className="h-11 rounded-2xl border-[#dbe7d8]" placeholder="Ko'cha, uy, kvartira raqami" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#4A7A5A]">Qo'shimcha izoh</label>
                <textarea value={form.notes} onChange={update("notes")}
                  className="min-h-20 w-full rounded-[20px] border border-[#dbe7d8] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d4f8a]"
                  placeholder="Qo'shimcha talablar..." />
              </div>
            </div>

            {/* Payment method */}
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

            <Button
              disabled={placing || !cart.length}
              className="h-12 w-full rounded-full bg-[#1d4f8a] text-white hover:bg-[#164078] text-base font-bold"
              onClick={() => onPlace({ paymentMethod, promoCode: appliedCode || undefined, discountAmount, deliveryFee, addressDetail: addressDetail || undefined })}
            >
              {placing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Buyurtma berish · {formatPrice(finalTotal)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
