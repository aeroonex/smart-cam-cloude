import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Globe, Moon, Shield,
  ScrollText, HelpCircle, Building2, Trash2, LogOut,
} from "lucide-react";
import { clearVideoCache, getStorageUsage } from "@/utils/storage";
import { useSessionContext } from "@/components/session-context-provider";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/hooks/useI18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { toast } from "sonner";
import type { Lang } from "@/lib/i18n";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useSessionContext();
  const { profile } = useProfile(user);
  const { lang, setLang } = useI18n();
  const [darkMode, setDarkMode] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  async function handleSignOut() {
    await signOut();
    toast.success("Chiqildi");
    navigate("/");
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#F7F8FA" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-4 flex items-center gap-3"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <button onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F5F5F5]">
          <ChevronLeft className="h-5 w-5 text-neutral-700" />
        </button>
        <h1 className="text-[18px] font-extrabold text-neutral-900">Sozlamalar</h1>
      </header>

      {/* User card */}
      {user && (
        <div className="mx-4 mt-4 mb-3 rounded-3xl bg-white flex items-center gap-3 px-4 py-4"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <Avatar className="h-12 w-12 border border-neutral-100">
            <AvatarFallback className="bg-[#F5F5F5] text-neutral-700 font-bold">
              {getInitials(profile?.full_name || user.email || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-extrabold text-neutral-900 truncate">{profile?.full_name || "Foydalanuvchi"}</p>
            <p className="text-[12px] text-neutral-400 truncate">{profile?.phone || user.email}</p>
          </div>
        </div>
      )}

      {/* Ilova sozlamalari */}
      <p className="mx-4 mt-5 mb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ilova</p>
      <div className="mx-4 rounded-3xl bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

        {/* Til */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
              <Globe className="h-[18px] w-[18px] text-neutral-600" />
            </div>
            <span className="text-[15px] font-medium text-neutral-800">Til</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-neutral-400">{lang === "uz" ? "O'zbek" : "Русский"}</span>
            <div className="flex rounded-xl overflow-hidden border border-neutral-200">
              {(["uz", "ru"] as Lang[]).map(code => (
                <button key={code} onClick={() => setLang(code)}
                  className={`px-3 py-1.5 text-[12px] font-semibold transition ${lang === code ? "bg-neutral-900 text-white" : "bg-white text-neutral-500"}`}>
                  {code === "uz" ? "UZ" : "RU"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
              <Moon className="h-[18px] w-[18px] text-neutral-600" />
            </div>
            <span className="text-[15px] font-medium text-neutral-800">Qorong'i rejim</span>
          </div>
          <button onClick={() => setDarkMode(d => !d)}
            className={`relative h-7 w-12 rounded-full transition-colors ${darkMode ? "bg-neutral-900" : "bg-neutral-200"}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${darkMode ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Ma'lumot */}
      <p className="mx-4 mt-5 mb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ma'lumot</p>
      <div className="mx-4 rounded-3xl bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <SettingsItem icon={<Shield className="h-[18px] w-[18px]" />} label="Maxfiylik siyosati" onClick={() => navigate("/privacy")} />
        <SettingsItem icon={<ScrollText className="h-[18px] w-[18px]" />} label="Foydalanish shartlari" onClick={() => navigate("/terms")} />
        <SettingsItem icon={<HelpCircle className="h-[18px] w-[18px]" />} label="Yordam markazi"
          onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} />
        <SettingsItem icon={<Building2 className="h-[18px] w-[18px]" />} label="Biz haqimizda" onClick={() => navigate("/about")} />
      </div>

      {/* Ilg'or */}
      <p className="mx-4 mt-5 mb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ilg'or</p>
      <div className="mx-4 rounded-3xl bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <SettingsItem icon={<Trash2 className="h-[18px] w-[18px]" />} label="Keshni tozalash"
          onClick={async () => {
            const before = await getStorageUsage();
            const freed = await clearVideoCache();
            toast.success(freed > 0 ? `Kesh tozalandi (${before.usedMB} MB)` : "Kesh toza");
          }} />
      </div>

      {/* Logout */}
      {user && (
        <>
          <div className="mx-4 mt-5 rounded-3xl bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <button onClick={() => setLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-neutral-50 transition">
              <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut className="h-[18px] w-[18px] text-red-500" />
              </div>
              <span className="text-[15px] font-semibold text-red-500">Chiqish</span>
            </button>
          </div>
        </>
      )}

      <p className="text-center text-[11px] text-neutral-300 mt-8">HammaBop v1.0 · 2025</p>

      {/* Logout Confirm Modal */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setLogoutConfirm(false); }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
            style={{ animation: "slidein .3s cubic-bezier(.22,1,.36,1)" }}>
            <style>{`@keyframes slidein{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <h2 className="text-[20px] font-extrabold text-neutral-900 text-center mb-2">Chiqish</h2>
            <p className="text-[14px] text-neutral-400 text-center mb-6">Hisobdan chiqmoqchimisiz?</p>
            <div className="flex gap-3">
              <button onClick={() => setLogoutConfirm(false)}
                className="flex-1 h-12 rounded-2xl bg-[#F5F5F5] text-neutral-700 font-semibold text-[14px] active:scale-[0.98] transition">
                Bekor
              </button>
              <button onClick={handleSignOut}
                className="flex-1 h-12 rounded-2xl bg-neutral-900 text-white font-semibold text-[14px] active:scale-[0.98] transition">
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 last:border-b-0 active:bg-neutral-50 transition">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 text-neutral-600">
          {icon}
        </div>
        <span className="text-[15px] font-medium text-neutral-800">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-300" />
    </button>
  );
}
