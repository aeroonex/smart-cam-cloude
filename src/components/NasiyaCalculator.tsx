import { useState } from "react";
import { Calculator, ExternalLink } from "lucide-react";

type Props = {
  price: number;
};

const PLANS = [
  { months: 3,  label: "3 oy",  alifRate: 0.02, uzumRate: 0.025 },
  { months: 6,  label: "6 oy",  alifRate: 0.025, uzumRate: 0.03 },
  { months: 12, label: "12 oy", alifRate: 0.03, uzumRate: 0.035 },
];

export function NasiyaCalculator({ price }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [provider, setProvider] = useState<"alif" | "uzum">("alif");

  const plan = PLANS[selected];
  const rate = provider === "alif" ? plan.alifRate : plan.uzumRate;
  const totalWithCommission = Math.round(price * (1 + rate * plan.months));
  const monthly = Math.round(totalWithCommission / plan.months);
  const commission = totalWithCommission - price;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-[#1d4f8a]"
      >
        <span className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Nasiya kalkulyatori
        </span>
        <span className="text-base">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {/* Provider tabs */}
          <div className="flex gap-2">
            {(["alif", "uzum"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  provider === p
                    ? "bg-[#1d4f8a] text-white shadow"
                    : "bg-white text-neutral-600 border border-neutral-200"
                }`}
              >
                {p === "alif" ? "Alif Nasiya" : "Uzum Nasiya"}
              </button>
            ))}
          </div>

          {/* Month selector */}
          <div className="flex gap-2">
            {PLANS.map((pl, i) => (
              <button
                key={pl.months}
                onClick={() => setSelected(i)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  selected === i
                    ? "bg-neutral-900 text-white"
                    : "bg-white border border-neutral-200 text-neutral-600"
                }`}
              >
                {pl.label}
              </button>
            ))}
          </div>

          {/* Result */}
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Oylik to'lov:</span>
              <span className="text-xl font-extrabold text-neutral-900">
                {monthly.toLocaleString()} so'm
              </span>
            </div>
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Jami ({plan.months} oy):</span>
              <span>{totalWithCommission.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Komissiya ({(rate * 100).toFixed(1)}%/oy):</span>
              <span className="text-blue-600">+{commission.toLocaleString()} so'm</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-2">
            <a
              href="https://alif.uz/nasiya"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${
                provider === "alif"
                  ? "bg-[#1d4f8a] text-white hover:bg-[#164078]"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              }`}
              onClick={(e) => { if (provider !== "alif") e.preventDefault(); }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Alif orqali ariza
            </a>
            <a
              href="https://uzum.uz/installment"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${
                provider === "uzum"
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              }`}
              onClick={(e) => { if (provider !== "uzum") e.preventDefault(); }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Uzum orqali ariza
            </a>
          </div>

          <p className="text-center text-[11px] text-neutral-400">
            * Hisob-kitob taxminiy. Aniq miqdor kredit tashkiloti tomonidan belgilanadi.
          </p>
        </div>
      )}
    </div>
  );
}
