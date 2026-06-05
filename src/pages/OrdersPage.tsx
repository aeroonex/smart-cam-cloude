import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { OrderCardSkeleton } from "@/components/Skeleton";
import { OrdersList } from "@/components/OrdersList";
import { useSessionContext } from "@/components/session-context-provider";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const { orders, loading, reload } = useOrders(user);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState<string | null>(null);

  const openTelegramLink = async (type: "connect" | "order", orderId?: string) => {
    if (!user) { navigate("/login"); return; }
    const key = orderId ?? type;
    setTelegramLinkLoading(key);
    const { data, error } = await supabase.functions.invoke("telegram-link", { body: { type, orderId } });
    setTelegramLinkLoading(null);
    if (error || !data?.url) { toast.error("Telegram havolasini yaratib bo'lmadi."); return; }
    window.open(data.url as string, "_blank", "noopener,noreferrer");
  };

  if (!user) {
    return (
      <PageLayout title="Buyurtmalarim">
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <p className="text-neutral-500 mb-4">Buyurtmalarni ko'rish uchun kiring</p>
          <button onClick={() => navigate("/login")}
            className="rounded-2xl bg-[#EE7526] px-8 py-3.5 text-[15px] font-bold text-white">
            Kirish
          </button>
        </div>
      </PageLayout>
    );
  }

  if (loading) return (
    <PageLayout title="Buyurtmalarim">
      <div className="px-3 pt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
      </div>
    </PageLayout>
  );

  return (
    <PageLayout
      title="Buyurtmalarim"
      right={
        <button
          onClick={() => void openTelegramLink("connect")}
          disabled={telegramLinkLoading === "connect"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#229ED9]/10 text-[#229ED9]"
        >
          {telegramLinkLoading === "connect"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <MessageCircle className="h-4 w-4" />
          }
        </button>
      }
    >
      <div className="pt-4">
        <OrdersList
          orders={orders}
          loading={loading}
          isTelegramConnected={false}
          telegramLinkLoading={telegramLinkLoading}
          onTelegramLink={openTelegramLink}
          onScrollToCatalog={() => navigate("/")}
        />
      </div>
    </PageLayout>
  );
}
