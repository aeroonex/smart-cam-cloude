import { useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, Package, UserRound } from "lucide-react";
import { useSessionContext } from "@/components/session-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { getInitials } from "@/lib/format";
import { haptic } from "@/utils/haptic";

type Tab = "home" | "catalog" | "cart" | "orders" | "profile" | "wishlist" | "none";

function NavBtn({
  active, label, onClick, children, badge,
}: {
  active: boolean; label: string; onClick: () => void;
  children: React.ReactNode; badge?: number;
}) {
  return (
    <button
      onClick={() => { void haptic.tab(); onClick(); }}
      className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 select-none transition-colors"
      style={{ color: active ? "#111111" : "#ABABAB" }}
    >
      <span style={{ transform: active ? "scale(1.08)" : "scale(1)", transition: "transform .25s" }}>
        {children}
      </span>
      <span className={`text-[10px] font-semibold leading-none ${active ? "text-neutral-900" : "text-neutral-400"}`}>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none z-10">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function BottomNav({ active, cartCount }: { active: Tab; cartCount?: number }) {
  const navigate = useNavigate();
  const { user, loading } = useSessionContext();
  const { profile } = useProfile(user);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100"
      style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        <NavBtn active={active === "home"} label="Home" onClick={() => navigate("/")}>
          <Home strokeWidth={active === "home" ? 2.5 : 1.8} style={{ width: 22, height: 22 }} />
        </NavBtn>

        <NavBtn active={active === "catalog"} label="Catalog" onClick={() => navigate("/?tab=catalog")}>
          <LayoutGrid strokeWidth={active === "catalog" ? 2.5 : 1.8} style={{ width: 22, height: 22 }} />
        </NavBtn>

        <NavBtn active={active === "cart"} label="Cart" onClick={() => navigate("/cart")} badge={cartCount}>
          <ShoppingCart strokeWidth={active === "cart" ? 2.5 : 1.8} style={{ width: 22, height: 22 }} />
        </NavBtn>

        <NavBtn active={active === "orders"} label="Orders" onClick={() => navigate("/orders")}>
          <Package strokeWidth={active === "orders" ? 2.5 : 1.8} style={{ width: 22, height: 22 }} />
        </NavBtn>

        <NavBtn active={active === "profile"} label="Profile" onClick={() => navigate("/profile")}>
          {!loading && user ? (
            <Avatar style={{ width: 22, height: 22 }}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-neutral-200 text-[7px] font-bold text-neutral-700">
                {getInitials(profile?.full_name || user.email || "")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserRound strokeWidth={active === "profile" ? 2.5 : 1.8} style={{ width: 22, height: 22 }} />
          )}
        </NavBtn>
      </div>
    </nav>
  );
}
