import { useState } from "react";
import { Send, Loader2, Bell, BellRing, Users, UserCog, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { enableWebPush } from "@/hooks/useWebPush";

type Target = "all" | "user" | "admin" | "seller";

const TARGETS: { id: Target; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "Hammaga", icon: Megaphone },
  { id: "user", label: "Mijozlar", icon: Users },
  { id: "seller", label: "Sotuvchilar", icon: UserCog },
  { id: "admin", label: "Adminlar", icon: Bell },
];

export function AdminPush() {
  const [target, setTarget] = useState<Target>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);

  const enableHere = async () => {
    setEnabling(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Avval tizimga kiring"); setEnabling(false); return; }
    const res = await enableWebPush(user.id);
    setEnabling(false);
    if (res.ok) toast.success("✅ Bu qurilma ulandi! Endi push qabul qiladi");
    else toast.error("Yoqilmadi: " + res.reason);
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Sarlavha va matnni to'ldiring");
      return;
    }
    setSending(true);
    setLastResult(null);

    // target="all" → role yubormay, barcha tokenlarga
    const payload: Record<string, unknown> = { title, body, url: url || undefined };
    if (target !== "all") payload.role = target;

    const { data, error } = await supabase.functions.invoke("send-push", { body: payload });
    setSending(false);

    if (error || (data as any)?.error) {
      const msg = (data as any)?.message ?? error?.message ?? "Yuborilmadi";
      toast.error(msg);
      if ((data as any)?.error === "fcm_not_configured") {
        setLastResult("⚠️ FCM_SERVICE_ACCOUNT maxfiysi Supabase'da o'rnatilmagan");
      }
      return;
    }

    const sent = (data as any)?.sent ?? 0;
    const total = (data as any)?.total ?? sent;
    toast.success(`Yuborildi: ${sent} ta qurilmaga`);
    setLastResult(`✅ ${sent}/${total} qurilmaga yetkazildi`);
    setTitle(""); setBody(""); setUrl("");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold">Push bildirishnoma yuborish</h2>
        <p className="text-sm text-gray-500">
          Matn yozing — foydalanuvchilar telefoniga (ilova yopiq bo'lsa ham) banner keladi
        </p>
      </div>

      {/* Shu qurilmada yoqish */}
      <button onClick={enableHere} disabled={enabling}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1d4f8a]/40 bg-[#1d4f8a]/5 py-3 text-sm font-semibold text-[#1d4f8a] disabled:opacity-50">
        {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        Shu qurilmada (brauzer) bildirishnomani yoqish — test uchun
      </button>

      {/* Target */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Kimga yuborilsin?</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TARGETS.map((t) => (
            <button key={t.id} onClick={() => setTarget(t.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition ${
                target === t.id ? "border-[#1d4f8a] bg-[#1d4f8a]/5 text-[#1d4f8a]" : "border-gray-200 text-gray-500"
              }`}>
              <t.icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
            placeholder="Masalan: Katta chegirma! 🔥"
            className="w-full rounded-xl border px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Matn</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} rows={3}
            placeholder="Bugun barcha kameralarga 30% chegirma. Shoshiling!"
            className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Havola <span className="font-normal text-gray-400">(ixtiyoriy — bosilganda ochiladi)</span>
          </label>
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="/product/123 yoki /search?q=kamera"
            className="w-full rounded-xl border px-3 py-2.5 text-sm" />
        </div>

        {/* Oldindan ko'rish */}
        {(title || body) && (
          <div className="rounded-xl bg-[#13172a] p-3 text-white">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Telefon ko'rinishi</p>
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1d4f8a]">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{title || "Sarlavha"}</p>
                <p className="text-xs text-white/70">{body || "Matn..."}</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={send} disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d4f8a] py-3 font-bold text-white disabled:opacity-50">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Yuborish
        </button>

        {lastResult && <p className="text-center text-sm text-gray-600">{lastResult}</p>}
      </div>

      <p className="text-xs text-gray-400">
        💡 Eslatma: faqat ilovaga kirgan va bildirishnomaga ruxsat bergan qurilmalarga yetadi.
        Push ishlashi uchun Supabase'da <b>FCM_SERVICE_ACCOUNT</b> maxfiysi o'rnatilgan bo'lishi kerak.
      </p>
    </div>
  );
}
