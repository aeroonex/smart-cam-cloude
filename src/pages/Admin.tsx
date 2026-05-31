import { useEffect, useState } from "react";
import {
  ArrowLeft, BarChart3, Bell, CreditCard, LayoutDashboard,
  Loader2, LogOut, Menu, MessageSquare, Package,
  Settings, ShoppingBag, Store, Wallet, X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HammaBopLogo } from "@/components/HammaBopLogo";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";
import type { AdminSection } from "@/components/admin/adminTypes";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminMarketing } from "@/components/admin/AdminMarketing";
import { AdminPartners } from "@/components/admin/AdminPartners";
import { AdminFinance } from "@/components/admin/AdminFinance";
import { AdminReviews } from "@/components/admin/AdminReviews";
import { AdminSystem } from "@/components/admin/AdminSystem";


const NAV: { id: AdminSection; label: string; icon: React.ElementType; sub?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, sub: "Analitika" },
  { id: "orders", label: "Buyurtmalar", icon: ShoppingBag, sub: "Kanban boshqaruv" },
  { id: "products", label: "Mahsulotlar", icon: Package, sub: "Katalog & Sklad" },
  { id: "marketing", label: "Marketing", icon: BarChart3, sub: "Promo & Aksiyalar" },
  { id: "partners", label: "Hamkorlar", icon: Store, sub: "Do'konlar & Komissiya" },
  { id: "finance", label: "Moliya", icon: Wallet, sub: "Cashback & Balans" },
  { id: "reviews", label: "Izohlar", icon: MessageSquare, sub: "Moderatsiya" },
  { id: "system", label: "Tizim", icon: Settings, sub: "Logs & Xavfsizlik" },
];

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSessionContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => {
      if (data?.role === "admin") setIsAdmin(true);
      else { setIsAdmin(false); toast.error("Admin huquqi yo'q."); navigate("/"); }
    });
  }, [user, sessionLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "yangi")
      .then(({ count }) => setNewOrderCount(count ?? 0));
  }, [isAdmin]);

  if (sessionLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa]">
        <Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const handleNav = (id: AdminSection) => {
    setSection(id);
    setSidebarOpen(false);
  };

  const activeItem = NAV.find(n => n.id === section)!;

  return (
    <div className="flex min-h-screen bg-[#f5f6fa]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#13172a] shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[65px] items-center gap-3 border-b border-white/10 px-5">
          <HammaBopLogo size={34} />
          <div className="min-w-0">
            <p className="font-extrabold leading-tight text-white">
              <span className="text-[#EE7526]">Hamma</span>Bop
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto shrink-0 rounded-lg p-1.5 text-white/30 hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          {NAV.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                  active
                    ? "bg-[#EE7526] text-white shadow-lg shadow-orange-500/25"
                    : "text-white/55 hover:bg-white/6 hover:text-white"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-none">{item.label}</p>
                  {item.sub && (
                    <p className={`mt-0.5 text-[10px] truncate ${active ? "text-white/70" : "text-white/30"}`}>
                      {item.sub}
                    </p>
                  )}
                </div>
                {item.id === "orders" && newOrderCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {newOrderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-white/10 p-4 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-white/40 transition hover:bg-white/6 hover:text-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Do'konga qaytish
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-[65px] items-center gap-4 border-b border-neutral-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <activeItem.icon className="h-5 w-5 text-[#EE7526]" />
              <h1 className="font-bold text-neutral-900">{activeItem.label}</h1>
            </div>
            <p className="hidden text-xs text-neutral-400 sm:block">
              {new Date().toLocaleDateString("uz-UZ", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative rounded-xl border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-50 transition"
              onClick={() => handleNav("orders")}
            >
              <Bell className="h-5 w-5" />
              {newOrderCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {newOrderCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EE7526] text-[10px] font-extrabold text-white">
                A
              </div>
              <span className="hidden text-sm font-medium text-neutral-700 sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {section === "dashboard" && <AdminDashboard onNavigate={handleNav} />}
          {section === "orders" && <AdminOrders />}
          {section === "products" && <AdminProducts />}
          {section === "marketing" && <AdminMarketing />}
          {section === "partners" && <AdminPartners />}
          {section === "finance" && <AdminFinance />}
          {section === "reviews" && <AdminReviews />}
          {section === "system" && <AdminSystem />}
        </main>
      </div>
    </div>
  );
}
