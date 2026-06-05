import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

type Step = {
  key: Order["status"];
  label: string;
  icon: string;
  desc: string;
};

const STEPS: Step[] = [
  { key: "yangi",             label: "Yangi",         icon: "📋", desc: "Buyurtma qabul qilindi" },
  { key: "qabul_qilindi",    label: "Tasdiqlandi",   icon: "✅", desc: "Admin tasdiqladi" },
  { key: "tolov_jarayonida", label: "To'lov",        icon: "💳", desc: "To'lov jarayonida" },
  { key: "qadoqlanmoqda",    label: "Qadoqlanmoqda", icon: "📦", desc: "Mahsulot tayyorlanmoqda" },
  { key: "yetkazilmoqda",    label: "Yo'lda",        icon: "🚚", desc: "Kuryer yetkazib bormoqda" },
  { key: "mijoz_qabul_qildi",label: "Yetkazildi",   icon: "🎉", desc: "Muvaffaqiyatli yetkazildi" },
];

const REJECTED: Step = { key: "rad_etildi", label: "Rad etildi", icon: "❌", desc: "Buyurtma bekor qilindi" };

type Props = { order: Order };

export function OrderTracking({ order }: Props) {
  if (order.status === "rad_etildi") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
        <span className="text-2xl">{REJECTED.icon}</span>
        <div>
          <p className="font-semibold text-red-700">{REJECTED.label}</p>
          <p className="text-xs text-red-500">{REJECTED.desc}</p>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const current = STEPS[currentIdx] ?? STEPS[0];

  return (
    <div className="space-y-3">
      {/* Animated truck when in delivery */}
      {order.status === "yetkazilmoqda" && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-blue-100 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-[#1d4f8a]">Kuryer yo'lda!</span>
          </div>
          {/* Road animation */}
          <div className="relative h-10 flex items-center">
            <div className="absolute inset-x-0 bottom-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full w-1/3 bg-blue-300 rounded-full animate-[slide_2s_linear_infinite]" />
            </div>
            <div
              className="text-3xl animate-[truck_4s_linear_infinite]"
              style={{ position: "absolute", bottom: 6 }}
            >
              🚚
            </div>
          </div>
          <style>{`
            @keyframes truck {
              0%   { left: -10%; }
              100% { left: 95%; }
            }
            @keyframes slide {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-start gap-0">
        {STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const last = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* Left line */}
                <div className={`flex-1 h-0.5 ${i === 0 ? "invisible" : done ? "bg-[#1d4f8a]" : "bg-neutral-200"}`} />
                {/* Circle */}
                <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-all ${
                  active
                    ? "border-[#1d4f8a] bg-[#1d4f8a] text-white shadow-lg shadow-orange-200 scale-110"
                    : done
                    ? "border-[#1d4f8a] bg-[#1d4f8a] text-white"
                    : "border-neutral-200 bg-white text-neutral-400"
                }`}>
                  {done ? (active ? step.icon : "✓") : <span className="text-[10px]">{i + 1}</span>}
                  {active && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-blue-300 opacity-40" />
                  )}
                </div>
                {/* Right line */}
                <div className={`flex-1 h-0.5 ${last ? "invisible" : done && !active ? "bg-[#1d4f8a]" : i < currentIdx ? "bg-[#1d4f8a]" : "bg-neutral-200"}`} />
              </div>
              <p className={`mt-1.5 text-center text-[10px] font-semibold leading-tight ${active ? "text-[#1d4f8a]" : done ? "text-neutral-700" : "text-neutral-400"}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current status description */}
      <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <span className="text-xl">{current.icon}</span>
        <div>
          <p className="text-sm font-semibold text-neutral-800">{current.label}</p>
          <p className="text-xs text-neutral-500">{current.desc}</p>
        </div>
        {order.status === "qadoqlanmoqda" && (
          <span className="ml-auto text-xl animate-bounce">📦</span>
        )}
        {order.status === "mijoz_qabul_qildi" && (
          <span className="ml-auto text-xl animate-bounce">🎉</span>
        )}
      </div>
    </div>
  );
}
