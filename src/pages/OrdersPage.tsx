import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, Search, X } from "lucide-react";
import { OrdersList } from "@/components/OrdersList";
import { OrderSuccess } from "@/components/OrderSuccess";
import { OrderCardSkeleton } from "@/components/Skeleton";
import { useSessionContext } from "@/components/session-context-provider";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

/* ── Telegram banner (shown if user has no telegram_id, dismissible) ── */
function TelegramBanner({ userId, onDismiss }: { userId: string; onDismiss: () => void }) {
  const [linking, setLinking] = useState(false);

  async function connect() {
    setLinking(true);
    const { data, error } = await supabase.functions.invoke("telegram-link", { body: { type: "connect" } });
    setLinking(false);
    if (error || !data?.url) return;
    window.open(data.url as string, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-[#229ED9]/20 bg-gradient-to-r from-[#229ED9]/8 to-blue-50 p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-[#229ED9]/15 flex items-center justify-center shrink-0 text-lg">
        🤖
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-neutral-800">Telegram bot bilan ulaning</p>
        <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
          Buyurtma yangilanishlari to'g'ridan-to'g'ri TG ga keladi
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={connect}
          disabled={linking}
          className="rounded-xl bg-[#229ED9] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60 active:scale-95 transition-transform"
        >
          {linking ? "…" : "Ulash"}
        </button>
        <button
          onClick={onDismiss}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-neutral-200/60 text-neutral-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSessionContext();
  const { orders, loading } = useOrders(user);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(searchParams.get("success"));
  const [hasTelegram, setHasTelegram] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("tg-banner-dismissed") === "1"
  );

  /* Clear success param */
  useEffect(() => {
    if (successOrderId) setSearchParams({}, { replace: true });
  }, []);

  /* Check if user has telegram linked */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("telegram_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setHasTelegram(!!data?.telegram_id);
      });
  }, [user]);

  function dismissBanner() {
    localStorage.setItem("tg-banner-dismissed", "1");
    setBannerDismissed(true);
  }

  /* Not logged in */
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between">
          <h1 className="text-[20px] font-extrabold text-neutral-900">Buyurtmalarim</h1>
          <button onClick={() => navigate("/search")}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <Search className="h-4.5 w-4.5 text-neutral-600" style={{ width: 18, height: 18 }} />
          </button>
        </header>
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="h-20 w-20 rounded-3xl bg-[#F5F5F5] flex items-center justify-center mb-5">
            <Package className="h-10 w-10 text-neutral-400" />
          </div>
          <h2 className="text-[20px] font-extrabold text-neutral-900">Kirish talab etiladi</h2>
          <p className="mt-2 text-[14px] text-neutral-400">Buyurtmalarni ko'rish uchun hisobingizga kiring</p>
          <button onClick={() => navigate("/login")}
            className="mt-6 rounded-2xl bg-black px-10 py-3.5 text-[14px] font-bold text-white active:scale-95 transition-transform">
            Kirish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-neutral-900">Buyurtmalarim</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/search")}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
            <Search className="text-neutral-600" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </header>

      <div>
        {/* ── Telegram banner ── */}
        {hasTelegram === false && !bannerDismissed && user && (
          <div className="mx-4 mt-3">
            <TelegramBanner userId={user.id} onDismiss={dismissBanner} />
          </div>
        )}

        <OrdersList
          orders={orders}
          loading={loading}
          onScrollToCatalog={() => navigate("/")}
        />
      </div>

      {/* ── Order success popup ── */}
      {successOrderId && (
        <OrderSuccess
          orderId={successOrderId}
          onClose={() => setSuccessOrderId(null)}
        />
      )}

      <BottomNav active="orders" />
    </div>
  );
}
