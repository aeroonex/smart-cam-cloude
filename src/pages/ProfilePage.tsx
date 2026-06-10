import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Copy,
  Gift, LayoutDashboard,
  MapPin, Package, Pencil,
  ShoppingBag,
  UserRound, Wallet, X, Save, Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSessionContext } from "@/components/session-context-provider";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { useOrders } from "@/hooks/useOrders";
import { useWishlist } from "@/hooks/useWishlist";
import { getInitials } from "@/lib/format";
import { regions } from "@/constants";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const { profile, form, setForm, saving, save } = useProfile(user);
  const { cashbackBalance, walletBalance, referralCode, ensureReferralCode } = useWallet(user);
  const { orders: ordersRaw } = useOrders(user);
  const { wishlistIds: wishlistRaw } = useWishlist();

  const orders = ordersRaw ?? [];
  const wishlist = wishlistRaw ?? [] as string[];

  const [editOpen, setEditOpen] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(referralCode ?? null);
  const [showReferral, setShowReferral] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const totalBalance = (cashbackBalance ?? 0) + (walletBalance ?? 0);
  const activeOrders = orders.filter(
    o => !["yetkazildi", "rad_etildi", "mijoz_qabul_qildi"].includes(o.status)
  ).length;

  async function handleSave() {
    if (!form.full_name || !form.phone || !form.region) {
      toast.error("Barcha maydonlarni to'ldiring"); return;
    }
    const ok = await save();
    if (ok) { toast.success("Profil saqlandi!"); setEditOpen(false); }
  }

  async function handleGetRefCode() {
    const code = await ensureReferralCode();
    setRefCode(code);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);
      toast.success("Rasm yangilandi");
    } catch {
      toast.error("Rasmni yuklashda xato");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F7F8FA" }}>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center justify-between" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <h1 className="text-[20px] font-extrabold text-neutral-900">Profile</h1>
        <button onClick={() => navigate("/settings")}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Avatar + name */}
      {user ? (
        <div className="mx-4 mt-4 mb-3 rounded-3xl bg-white flex flex-col items-center py-6 px-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div className="relative mb-3">
            <Avatar className="h-24 w-24 border-2 border-neutral-100">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#F5F5F5] text-neutral-700 text-2xl font-bold">
                {getInitials(profile?.full_name || user.email || "")}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-neutral-900 border-2 border-white flex items-center justify-center"
            >
              <Pencil className="h-3 w-3 text-white" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <h2 className="text-[18px] font-extrabold text-neutral-900">{profile?.full_name || "Foydalanuvchi"}</h2>
          {profile?.phone
            ? <p className="text-[13px] text-neutral-400 mt-0.5">{profile.phone}</p>
            : <p className="text-[13px] text-neutral-400 mt-0.5">{user.email}</p>
          }
          <div className="flex items-center gap-6 mt-4">
            <button onClick={() => navigate("/orders")} className="flex flex-col items-center gap-0.5">
              <span className="text-[18px] font-extrabold text-neutral-900">{orders.length}</span>
              <span className="text-[11px] text-neutral-400">Buyurtma</span>
            </button>
            <div className="w-px h-8 bg-neutral-100" />
            <button onClick={() => navigate("/wishlist")} className="flex flex-col items-center gap-0.5">
              <span className="text-[18px] font-extrabold text-neutral-900">{wishlist.length}</span>
              <span className="text-[11px] text-neutral-400">Saralangan</span>
            </button>
            {totalBalance > 0 && (
              <>
                <div className="w-px h-8 bg-neutral-100" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[18px] font-extrabold text-neutral-900">{Math.floor(totalBalance / 1000)}K</span>
                  <span className="text-[11px] text-neutral-400">Bonus</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 px-4">
          <div className="h-24 w-24 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-3">
            <UserRound className="h-12 w-12 text-neutral-300" />
          </div>
          <h2 className="text-[18px] font-extrabold text-neutral-900">Profilga kiring</h2>
          <p className="text-[13px] text-neutral-400 mt-1">Buyurtmalar va bonuslar uchun</p>
          <button onClick={() => navigate("/login")}
            className="mt-4 rounded-2xl bg-black px-8 py-3 text-[14px] font-bold text-white active:scale-95 transition">
            Kirish
          </button>
        </div>
      )}

      {/* Menu */}
      <div className="mx-4 rounded-3xl bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        {user && (
          <MenuItem icon={<UserRound className="h-[18px] w-[18px]" />} label="Edit Profile" onClick={() => setEditOpen(true)} />
        )}
        {user && (
          <MenuItem
            icon={<Package className="h-[18px] w-[18px]" />}
            label="Buyurtmalarim"
            right={activeOrders > 0 ? (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white">{activeOrders}</span>
            ) : undefined}
            onClick={() => navigate("/orders")}
          />
        )}
        {user && (
          <MenuItem icon={<Heart className="h-[18px] w-[18px]" />} label="Saqlanganlar" onClick={() => navigate("/wishlist")} />
        )}
        {user && totalBalance > 0 && (
          <MenuItem
            icon={<Wallet className="h-[18px] w-[18px]" />}
            label="Hamyon"
            right={<span className="text-[13px] font-semibold text-neutral-500">{totalBalance.toLocaleString()} so'm</span>}
            onClick={() => navigate("/", { state: { section: "wallet" } })}
          />
        )}
        <MenuItem icon={<MapPin className="h-[18px] w-[18px]" />} label="Topshirish punktlari" onClick={() => navigate("/pickup-points")} />
        {user && (
          <MenuItem
            icon={<Gift className="h-[18px] w-[18px]" />}
            label="Do'stlarni taklif qiling"
            onClick={() => { setShowReferral(r => !r); if (!showReferral) handleGetRefCode(); }}
          />
        )}
        {user && profile?.role === "admin" && (
          <MenuItem
            icon={<LayoutDashboard className="h-[18px] w-[18px] text-orange-500" />}
            label="Admin panel"
            labelClass="text-orange-500 font-bold"
            onClick={() => navigate("/admin")}
          />
        )}
        {user && (profile?.role === "seller" || profile?.role === "admin") && (
          <MenuItem icon={<ShoppingBag className="h-[18px] w-[18px]" />} label="Sotuvchi kabineti" onClick={() => navigate("/seller")} />
        )}
      </div>

      {/* Referral */}
      {showReferral && user && (
        <div className="mx-4 mt-3 rounded-2xl bg-[#F9F9F9] p-4">
          <p className="text-[12px] font-semibold text-neutral-500 mb-2">Referal kodingiz</p>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200 px-3 py-2.5">
            <code className="flex-1 text-[16px] font-extrabold text-neutral-900 tracking-widest">
              {refCode ?? "------"}
            </code>
            <button onClick={() => { if (!refCode) return; navigator.clipboard.writeText(refCode); toast.success("Nusxalandi!"); }}
              className="flex items-center gap-1 text-[12px] font-semibold text-neutral-500">
              <Copy className="h-3.5 w-3.5" /> Nusxa
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">Har bir do'st uchun 5 000 so'm bonus olasiz!</p>
        </div>
      )}

      {/* Wallet card */}
      {user && totalBalance > 0 && (
        <div className="mx-4 mt-3 rounded-2xl bg-neutral-900 p-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-3">Hamyon</p>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] text-neutral-500 mb-0.5">Cashback</p>
              <p className="text-[18px] font-extrabold text-white">{cashbackBalance.toLocaleString()} <span className="text-[11px] font-normal text-neutral-400">so'm</span></p>
            </div>
            <div className="w-px bg-neutral-700" />
            <div>
              <p className="text-[11px] text-neutral-500 mb-0.5">Balans</p>
              <p className="text-[18px] font-extrabold text-white">{walletBalance.toLocaleString()} <span className="text-[11px] font-normal text-neutral-400">so'm</span></p>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-neutral-300 mt-6 mb-2">HammaBop · 2025</p>

      <BottomNav active="profile" />

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-10 space-y-4"
            style={{ animation: "slidein .3s cubic-bezier(.22,1,.36,1)" }}>
            <style>{`@keyframes slidein{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[17px] font-extrabold text-neutral-900">Edit Profile</h2>
              <button onClick={() => setEditOpen(false)}
                className="h-8 w-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
            {[
              { label: "Ism-familiya", key: "full_name", placeholder: "Abdullayev Akbar", type: "text" },
              { label: "Telefon", key: "phone", placeholder: "+998 90 123 45 67", type: "tel" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[12px] font-semibold text-neutral-400 mb-1.5">{f.label}</label>
                <input
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  type={f.type}
                  className="w-full h-12 rounded-2xl bg-[#F5F5F5] px-4 text-[14px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            ))}
            <div>
              <label className="block text-[12px] font-semibold text-neutral-400 mb-1.5">Viloyat</label>
              <select
                value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}
                className="w-full h-12 rounded-2xl bg-[#F5F5F5] px-4 text-[14px] text-neutral-700 focus:outline-none">
                <option value="">Hududni tanlang</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditOpen(false)}
                className="flex-1 h-12 rounded-2xl bg-[#F5F5F5] text-neutral-600 font-semibold text-[14px] active:scale-[0.98] transition">
                Bekor
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-12 rounded-2xl bg-neutral-900 text-white font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? "Saqlanmoqda..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, right, onClick, labelClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick: () => void;
  labelClass?: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 border-t border-neutral-100 first:border-t-0 active:bg-neutral-50 transition">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 text-neutral-600">
          {icon}
        </div>
        <span className={`text-[15px] font-medium text-neutral-800 ${labelClass}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <ChevronRight className="h-4 w-4 text-neutral-300" />
      </div>
    </button>
  );
}
