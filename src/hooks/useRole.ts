import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/components/session-context-provider";

export type Role = "user" | "admin" | "seller" | "courier";

/**
 * Joriy foydalanuvchining rolini qaytaradi. Yagona kirish (single sign-on) —
 * rolga qarab ilova interfeysi ajratiladi.
 */
export function useRole() {
  const { user, loading: sessionLoading } = useSessionContext();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!mounted) return;
        setRole((data?.role as Role) ?? "user");
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [user, sessionLoading]);

  return {
    role,
    loading: loading || sessionLoading,
    isAdmin: role === "admin",
    isSeller: role === "seller",
    isCourier: role === "courier",
  };
}

/** Rolga mos boshlang'ich yo'nalish */
export function roleHome(role: Role | null): string {
  switch (role) {
    case "admin": return "/admin";
    case "seller": return "/seller";
    case "courier": return "/seller";
    default: return "/";
  }
}
