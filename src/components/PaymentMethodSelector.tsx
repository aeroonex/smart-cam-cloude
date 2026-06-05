type Method = "cash" | "click" | "payme" | "alif" | "uzum";

type Props = {
  value: Method;
  onChange: (method: Method) => void;
};

const METHODS: { key: Method; label: string; icon: string; desc: string; color: string }[] = [
  {
    key: "cash",
    label: "Naqd pul",
    icon: "💵",
    desc: "Yetkazib berishda to'lang",
    color: "border-green-200 bg-green-50",
  },
  {
    key: "click",
    label: "Click",
    icon: "⚡",
    desc: "Click kartasi orqali",
    color: "border-blue-200 bg-blue-50",
  },
  {
    key: "payme",
    label: "Payme",
    icon: "💳",
    desc: "Payme orqali to'lash",
    color: "border-indigo-200 bg-indigo-50",
  },
  {
    key: "alif",
    label: "Alif Nasiya",
    icon: "🏦",
    desc: "3–12 oylik muddatli to'lov",
    color: "border-blue-200 bg-blue-50",
  },
  {
    key: "uzum",
    label: "Uzum Nasiya",
    icon: "🍇",
    desc: "Uzum orqali bo'lib to'lash",
    color: "border-purple-200 bg-purple-50",
  },
];

export function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-neutral-700">To'lov usuli</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
              value === m.key
                ? `${m.color} border-[#1d4f8a] shadow-sm`
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <span className="text-xl">{m.icon}</span>
            <div>
              <p className={`text-sm font-semibold ${value === m.key ? "text-neutral-900" : "text-neutral-700"}`}>
                {m.label}
              </p>
              <p className="text-[11px] text-neutral-500">{m.desc}</p>
            </div>
            {value === m.key && (
              <span className="ml-auto text-[#1d4f8a]">✓</span>
            )}
          </button>
        ))}
      </div>
      {(value === "alif" || value === "uzum") && (
        <div className="rounded-xl bg-blue-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          {value === "alif"
            ? "Buyurtmadan so'ng Alif skorinig havolasi yuboriladi."
            : "Buyurtmadan so'ng Uzum nasiya portali havolasi yuboriladi."}
        </div>
      )}
    </div>
  );
}
