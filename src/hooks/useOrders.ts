import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { statusMeta } from "@/constants";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function useOrders(user: User | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useOrders]", error);
        toast.error("Buyurtmalarni yuklab bo'lmadi.");
      } else {
        setOrders(data ?? []);
      }
    } catch (err) {
      console.error("[useOrders] unexpected", err);
      toast.error("Buyurtmalarni yuklashda xato yuz berdi.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    void load();

    const channel = supabase
      .channel(`smartcam-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const nextStatus = payload.new.status as Order["status"];
          const prevStatus = payload.old?.status as Order["status"] | undefined;
          if (prevStatus && prevStatus !== nextStatus) {
            toast.info(`Buyurtma holati yangilandi: ${statusMeta[nextStatus]?.label ?? nextStatus}`);
          }
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { orders, loading, reload: load };
}
