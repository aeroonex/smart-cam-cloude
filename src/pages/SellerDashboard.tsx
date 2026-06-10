import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, ScanLine, LogOut, Loader2, CheckCircle2, KeyRound,
  User as UserIcon, Save, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/components/session-context-provider";
import { useRole } from "@/hooks/useRole";
import { haptic } from "@/utils/haptic";
import { track } from "@/utils/analytics";
import { scanBarcode } from "@/utils/scanner";

type Stat = {
  handovers_today: number;
  handovers_week: number;
  handovers_total: number;
  revenue_total: number;
  full_name: string;
  login_code: string | null;
};

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSessionContext();
  const { role, loading: roleLoading } = useRole();
  const [stat, setStat] = useState<Stat | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"handover" | "profile">("handover");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("seller_stats").select("*").eq("seller_id", user.id).single();
    if (data) setStat(data as Stat);
  }, [user]);

  useEffect(() => {
    if (sessionLoading || roleLoading) return;
    if (!user) { navigate("/login"); return; }
    if (role && role !== "seller" && role !== "courier" && role !== "admin") {
      navigate("/");
      return;
    }
    void load();
  }, [user, role, sessionLoading, roleLoading, navigate, load]);

  const handover = async (rawCode: string) => {
    const c = rawCode.trim();
    if (!c) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("seller_handover", { p_code: c });
    setBusy(false);
    if (error) {
      haptic.error();
      const msg = error.message.includes("already_delivered") ? "Bu buyurtma allaqachon topshirilgan"
        : error.message.includes("order_not_found") ? "Buyurtma topilmadi"
        : "Topshirib bo'lmadi";
      toast.error(msg);
      return;
    }
    haptic.success();
    track("scan", { result: "handover_ok" });
    toast.success(`Buyurtma topshirildi! (${(data as any)?.[0]?.order_id?.slice(0, 8) ?? c})`);
    setCode("");
    void load();
  };

  const scanAndHandover = async () => {
    const result = await scanBarcode();
    if (result) await handover(result);
  };

  if (sessionLoading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1d4f8a]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f0f4fa] pb-24">
      {/* Header */}
      <div className="bg-[#1d4f8a] px-5 pt-6 pb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Sotuvchi paneli</p>
            <h1 className="text-xl font-bold">{stat?.full_name ?? "Sotuvchi"}</h1>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="rounded-xl bg-white/15 p-2.5"><LogOut className="h-5 w-5" /></button>
        </div>
        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Bugun" value={stat?.handovers_today ?? 0} />
          <StatCard label="Hafta" value={stat?.handovers_week ?? 0} />
          <StatCard label="Jami" value={stat?.handovers_total ?? 0} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 -mt-4 flex rounded-2xl bg-white p-1 shadow-sm">
        {(["handover", "profile"] as const).map((t) => (
          <button key={t} onClick={() => { haptic.tab(); setTab(t); }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t ? "bg-[#1d4f8a] text-white" : "text-gray-500"}`}>
            {t === "handover" ? "Topshirish" : "Profil"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "handover" ? (
          <div className="space-y-4">
            <button onClick={scanAndHandover} disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1d4f8a] py-5 text-white font-bold shadow-lg active:scale-95 transition disabled:opacity-60">
              <ScanLine className="h-7 w-7" /> QR / Shtrix-kodni skanerlash
            </button>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-gray-700">Yoki kodni qo'lda kiriting</p>
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="Buyurtma kodi" className="flex-1 rounded-xl border px-3 py-2.5 text-sm" />
                <button onClick={() => handover(code)} disabled={busy || !code}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Topshirish
                </button>
              </div>
            </div>
          </div>
        ) : (
          <SellerProfile userId={user!.id} onSaved={load} login={stat?.login_code ?? ""} name={stat?.full_name ?? ""} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur">
      <p className="flex items-center justify-center gap-1 text-2xl font-extrabold"><Package className="h-4 w-4" />{value}</p>
      <p className="text-[11px] text-white/70">{label}</p>
    </div>
  );
}

function SellerProfile({ userId, login, name, onSaved }: { userId: string; login: string; name: string; onSaved: () => void }) {
  const [fullName, setFullName] = useState(name);
  const [loginCode, setLoginCode] = useState(login);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setFullName(name); setLoginCode(login); }, [name, login]);

  const save = async () => {
    setSaving(true);
    // 1) users jadvali (trigger admin'ga audit/push yozadi)
    const { error: e1 } = await supabase.from("users")
      .update({ full_name: fullName, login_code: loginCode.trim().toLowerCase() })
      .eq("id", userId);
    // 2) parol (auth) + admin uchun audit
    let e2 = null;
    if (newPw) {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      e2 = error;
      if (!error) {
        await supabase.from("seller_profile_changes")
          .insert({ seller_id: userId, field: "password", old_value: "••••", new_value: "yangilandi" });
      }
    }
    // 3) Admin'ga push bildirishnoma
    void supabase.functions.invoke("send-push", {
      body: {
        role: "admin",
        title: "Sotuvchi profilni o'zgartirdi",
        body: `${fullName} login/parol/ma'lumotlarini yangiladi`,
        url: "/admin",
      },
    });
    setSaving(false);
    if (e1 || e2) { haptic.error(); toast.error(e1?.message ?? e2?.message ?? "Saqlanmadi"); return; }
    haptic.success();
    toast.success("Saqlandi — adminga xabar yuborildi");
    setNewPw("");
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <Field icon={<UserIcon className="h-4 w-4" />} label="To'liq ism" value={fullName} onChange={setFullName} />
      <Field icon={<KeyRound className="h-4 w-4" />} label="Login" value={loginCode} onChange={setLoginCode} />
      <Field icon={<KeyRound className="h-4 w-4" />} label="Yangi parol (ixtiyoriy)" value={newPw} onChange={setNewPw} type="password" />
      <button onClick={save} disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d4f8a] py-3 font-bold text-white disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saqlash
      </button>
      <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
        <TrendingUp className="h-3 w-3" /> Har bir o'zgarish admin tomonidan kuzatiladi
      </p>
    </div>
  );
}

function Field({ icon, label, value, onChange, type = "text" }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">{icon}{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm" />
    </div>
  );
}
