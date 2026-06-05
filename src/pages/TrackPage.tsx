import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Package, PackageCheck, Truck } from "lucide-react";

type TrackOrder = {
  id: string;
  status: string;
  payment_status: string;
  customer_name: string | null;
  customer_region: string | null;
  total_amount: number;
  items: Array<{ product_name?: string; quantity?: number; price?: number }>;
  created_at: string;
  tracking_token: string;
};

const STEPS = [
  { key: "yangi",             label: "Qabul qilindi",    icon: Package },
  { key: "qabul_qilindi",     label: "Tayyorlanmoqda",   icon: Clock },
  { key: "qadoqlanmoqda",     label: "Qadoqlanmoqda",    icon: PackageCheck },
  { key: "yetkazilmoqda",     label: "Yo'lda",           icon: Truck },
  { key: "mijoz_qabul_qildi", label: "Yetkazildi",       icon: CheckCircle2 },
] as const;

function stepIndex(status: string) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("id") ?? "");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params.get("id");
    if (id) handleSearch(id);
  }, []);

  async function handleSearch(tokenOrId?: string) {
    const query = (tokenOrId ?? input).trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setOrder(null);

    let result: TrackOrder | null = null;

    // Try as tracking token (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(query)) {
      const { data } = await supabase.rpc("get_order_by_tracking_token", {
        p_token: query,
      });
      result = data?.[0] ?? null;
    }

    // Try as short order ID (first 8 chars)
    if (!result && query.length >= 8) {
      const { data } = await supabase
        .from("orders")
        .select("id,status,payment_status,customer_name,customer_region,total_amount,items,created_at,tracking_token")
        .ilike("id", `${query}%`)
        .limit(1)
        .maybeSingle();
      result = data as TrackOrder | null;
    }

    if (result) {
      setOrder(result);
      setParams({ id: result.tracking_token });
    } else {
      setError("Buyurtma topilmadi. ID ni tekshirib qayta urinib ko'ring.");
    }
    setLoading(false);
  }

  const currentStep = order ? stepIndex(order.status) : -1;
  const isRejected = order?.status === "rad_etildi";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-[#1d4f8a] font-black text-xl">Hamma</span>
          <span className="font-black text-xl">Bop</span>
        </Link>
        <span className="text-gray-400 text-sm ml-auto">Buyurtma kuzatish</span>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        {/* Search card */}
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Buyurtmani kuzatish</h1>
          <p className="text-sm text-gray-500 mb-4">
            Buyurtma ID raqami yoki tracking havolasidagi kodni kiriting
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4f8a]"
              placeholder="Masalan: a1b2c3d4 yoki UUID..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-[#1d4f8a] text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#163d6d] transition-colors"
            >
              {loading ? "..." : "Qidirish"}
            </button>
          </div>
          {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
        </div>

        {/* Order result */}
        {order && (
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-md overflow-hidden">
            {/* Order header */}
            <div className="bg-[#1d4f8a] px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-70">Buyurtma</p>
                  <p className="font-mono font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">Jami summa</p>
                  <p className="font-bold">{formatPrice(order.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {!isRejected ? (
              <div className="px-6 py-5">
                <div className="relative">
                  {/* Line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
                  <div
                    className="absolute top-5 left-5 h-0.5 bg-[#1d4f8a] z-0 transition-all duration-700"
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * (100 - (100 / STEPS.length))}%` }}
                  />
                  {/* Steps */}
                  <div className="relative z-10 flex justify-between">
                    {STEPS.map((step, i) => {
                      const Icon = step.icon;
                      const done = i < currentStep;
                      const active = i === currentStep;
                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 w-16">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            done    ? "bg-[#1d4f8a] border-[#1d4f8a] text-white"
                            : active ? "bg-white border-[#1d4f8a] text-[#1d4f8a] shadow-md"
                            : "bg-white border-gray-200 text-gray-300"
                          }`}>
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                          <span className={`text-[10px] text-center leading-tight font-medium ${
                            done || active ? "text-[#1d4f8a]" : "text-gray-400"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 bg-red-50 flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="font-semibold text-red-700">Buyurtma rad etildi</p>
                  <p className="text-sm text-red-500">Batafsil ma'lumot uchun operator bilan bog'laning.</p>
                </div>
              </div>
            )}

            {/* Order details */}
            <div className="px-6 pb-5 space-y-3">
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Mijoz</span>
                  <span className="font-medium">{order.customer_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Viloyat</span>
                  <span className="font-medium">{order.customer_region ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To'lov</span>
                  <span className={`font-medium ${
                    order.payment_status === "paid" ? "text-green-600" : "text-orange-500"
                  }`}>
                    {order.payment_status === "paid" ? "✅ To'landi" : "⏳ Kutilmoqda"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sana</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString("uz-UZ")}
                  </span>
                </div>
              </div>

              {/* Items */}
              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Mahsulotlar</p>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.product_name ?? "Mahsulot"} × {item.quantity ?? 1}
                        </span>
                        <span className="font-medium">
                          {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        {!order && !loading && (
          <div className="w-full max-w-lg text-center text-gray-400 text-sm mt-4">
            <p>Buyurtma ID'ni SMS yoki Telegram xabaringizdan topishingiz mumkin.</p>
            <p className="mt-1">Yordam: <a href="https://t.me/hammabop_bot" className="text-[#1d4f8a] underline">@hammabop_bot</a></p>
          </div>
        )}
      </main>
    </div>
  );
}
