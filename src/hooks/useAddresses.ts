import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";

type Address = Database["public"]["Tables"]["user_addresses"]["Row"];

export function useAddresses(user: User | null) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function addAddress(addr: Omit<Address, "id" | "user_id" | "created_at">) {
    if (!user) return;
    if (addr.is_default) {
      await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    await supabase.from("user_addresses").insert({ ...addr, user_id: user.id });
    await load();
  }

  async function setDefault(id: string) {
    if (!user) return;
    await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("user_addresses").update({ is_default: true }).eq("id", id);
    await load();
  }

  async function deleteAddress(id: string) {
    await supabase.from("user_addresses").delete().eq("id", id);
    await load();
  }

  return { addresses, loading, load, addAddress, setDefault, deleteAddress };
}
