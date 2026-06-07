import { useNavigate } from "react-router-dom";
import { Home, ShoppingCart, Package, Heart, UserRound } from "lucide-react";
import { useSessionContext } from "@/components/session-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { getInitials } from "@/lib/format";

type Tab = "home" | "catalog" | "cart" | "orders" | "profile" | "wishlist" | "none";

function LiquidBtn({ active, label, color, bubbleBg, onClick, children, badge }: {
  active: boolean; label: string; color: string; bubbleBg: string;
  onClick: () => void; children: React.ReactNode; badge?: number;
}) {
  return (
    <button
      onClick={() => { try { if ("vibrate" in navigator) navigator.vibrate(active ? 6 : 10); } catch {} onClick(); }}
      className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] py-2 select-none"
      style={{ color: active ? color : "#8e8e93", transition: "color 0.3s ease" }}
    >
      <span className="absolute inset-0 rounded-[20px]" style={{
        background: bubbleBg,
        transform: active ? "scale(1)" : "scale(0)",
        opacity: active ? 1 : 0,
        transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        transformOrigin: "center bottom",
      }} />
      {active && <span className="absolute left-2 top-1.5 h-[6px] rounded-full pointer-events-none"
        style={{ width:"40%", background:"rgba(255,255,255,0.55)", filter:"blur(1px)" }} />}
      <span className="relative z-10" style={{
        transform: active ? "scale(1.12) translateY(-1px)" : "scale(1)",
        transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {children}
      </span>
      <span className="relative z-10 text-[9px] font-semibold leading-none"
        style={{ opacity: active ? 1 : 0.7, transition: "opacity 0.3s ease" }}>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none z-20 shadow-sm">
          {badge}
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
    <nav className="fixed bottom-4 left-0 right-0 z-[200] px-5 pointer-events-none">
      <div className="mx-auto max-w-sm pointer-events-auto">
        <div className="flex items-center justify-around rounded-[36px] px-1 py-1.5" style={{
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1.5px solid rgba(255,255,255,0.75)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.04) inset",
        }}>
          {/* Home */}
          <LiquidBtn active={active==="home"} label="Bosh sahifa" color="#FF6B35" bubbleBg="rgba(255,107,53,0.14)" onClick={() => navigate("/")}>
            <Home className="h-[21px] w-[21px]" strokeWidth={active==="home" ? 2.2 : 1.8} />
          </LiquidBtn>

          {/* Catalog */}
          <LiquidBtn active={active==="catalog"} label="Katalog" color="#3B82F6" bubbleBg="rgba(59,130,246,0.14)" onClick={() => navigate("/?tab=catalog")}>
            <svg className="h-[21px] w-[21px]" fill="none" stroke="currentColor"
              strokeWidth={active==="catalog" ? 2.2 : 1.8} viewBox="0 0 24 24">
              <rect x="3" y="3" width="8" height="8" rx="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5"/>
              <rect x="13" y="13" width="8" height="8" rx="1.5"/>
            </svg>
          </LiquidBtn>

          {/* Cart */}
          <LiquidBtn active={active==="cart"} label="Savat" color="#F59E0B" bubbleBg="rgba(245,158,11,0.14)"
            onClick={() => navigate("/cart")} badge={cartCount}>
            <ShoppingCart className="h-[21px] w-[21px]" strokeWidth={active==="cart" ? 2.2 : 1.8} />
          </LiquidBtn>

          {/* Orders */}
          <LiquidBtn active={active==="orders"} label="Buyurtmalar" color="#10B981" bubbleBg="rgba(16,185,129,0.14)" onClick={() => navigate("/orders")}>
            <Package className="h-[21px] w-[21px]" strokeWidth={active==="orders" ? 2.2 : 1.8} />
          </LiquidBtn>

          {/* Profile */}
          {!loading && user ? (
            <LiquidBtn active={active==="profile"} label="Kabinet" color="#8B5CF6" bubbleBg="rgba(139,92,246,0.14)" onClick={() => navigate("/profile")}>
              <Avatar className="h-[21px] w-[21px]">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-violet-400 text-[7px] font-bold text-white">
                  {getInitials(profile?.full_name || user.email || "")}
                </AvatarFallback>
              </Avatar>
            </LiquidBtn>
          ) : (
            <LiquidBtn active={active==="profile"} label="Kabinet" color="#8B5CF6" bubbleBg="rgba(139,92,246,0.14)" onClick={() => navigate("/profile")}>
              <UserRound className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </LiquidBtn>
          )}
        </div>
      </div>
    </nav>
  );
}
