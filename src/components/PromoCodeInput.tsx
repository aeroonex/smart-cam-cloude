import { useEffect, useState } from "react";
import { Tag, X, Loader2, CheckCircle2 } from "lucide-react";
import { usePromoCode } from "@/hooks/usePromoCode";

type Props = {
  cartTotal: number;
  onApplied: (discount: number, code: string) => void;
  onRemoved: () => void;
};

export function PromoCodeInput({ cartTotal, onApplied, onRemoved }: Props) {
  const [input, setInput] = useState("");
  const { loading, applied, error, applyCode, remove } = usePromoCode();

  async function handleApply() {
    if (!input.trim()) return;
    await applyCode(input, cartTotal);
  }

  // Render loop xatosini oldini olish uchun useEffect ishlatiladi
  useEffect(() => {
    if (applied) {
      onApplied(applied.discountAmount, applied.code.code);
    }
  }, [applied]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRemove() {
    remove();
    setInput("");
    onRemoved();
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-700">{applied.code.code}</p>
          <p className="text-xs text-green-600">
            −{applied.discountAmount.toLocaleString()} so'm chegirma qo'llandi
          </p>
          {applied.code.max_uses !== null && (
            <p className="text-[11px] text-red-500">
              Bu promokod {applied.code.max_uses} martagacha ishlatilishi mumkin
              ({applied.code.uses_count + 1}/{applied.code.max_uses})
            </p>
          )}
        </div>
        <button onClick={handleRemove} className="rounded-full p-1 hover:bg-green-100">
          <X className="h-4 w-4 text-green-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3">
          <Tag className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") void handleApply(); }}
            placeholder="Promokod kiriting"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none font-mono tracking-widest"
          />
        </div>
        <button
          onClick={() => void handleApply()}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-[#1d4f8a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#164078] transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Qo'lla"}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-500 px-1">{error}</p>
      )}
    </div>
  );
}
