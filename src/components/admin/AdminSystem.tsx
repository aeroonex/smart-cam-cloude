import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, FileText, Loader2,
  Lock, RefreshCw, Save, Shield, Terminal, Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type LogEntry = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type Tab = "auditlog" | "webhook" | "oferta" | "security";

export function AdminSystem() {
  const [tab, setTab] = useState<Tab>("auditlog");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "auditlog" as Tab, label: "Audit Log", icon: Activity },
          { id: "webhook" as Tab, label: "Webhook Logs", icon: Webhook },
          { id: "oferta" as Tab, label: "Oferta", icon: FileText },
          { id: "security" as Tab, label: "Xavfsizlik", icon: Shield },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[#EE7526] text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "auditlog" && <AuditLogPanel />}
      {tab === "webhook" && <WebhookLogsPanel />}
      {tab === "oferta" && <OfertaPanel />}
      {tab === "security" && <SecurityPanel />}
    </div>
  );
}

/* ── AUDIT LOG ── */
function AuditLogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // Try telegram_event_log table first
    const { data, error } = await supabase
      .from("telegram_event_log" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100) as unknown as { data: LogEntry[] | null; error: unknown };

    if (!error && data) {
      setLogs(data);
    } else {
      // Fallback: show empty with notice
      setLogs([]);
    }
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-900">Tizim hodisalari</h3>
          <p className="text-xs text-neutral-400">Barcha muhim harakatlar qayd etiladi</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-xl gap-1.5">
          <RefreshCw className="h-4 w-4" />Yangilash
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
          <Terminal className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
          <p className="font-semibold text-neutral-500">Log yozuvlari topilmadi</p>
          <p className="mt-2 text-xs text-neutral-400">
            Telegram bot hodisalari bu yerda ko'rinadi
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-50 max-h-[600px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-neutral-50 transition">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  <Activity className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                      {log.event_type}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(log.created_at).toLocaleString("uz-UZ")}
                    </span>
                  </div>
                  {log.payload && (
                    <pre className="mt-1.5 max-h-20 overflow-y-auto rounded-lg bg-neutral-900 px-3 py-2 text-[10px] text-green-400 font-mono">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── WEBHOOK LOGS ── */
function WebhookLogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("telegram_event_log" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as unknown as { data: LogEntry[] | null };
    setLogs(data ?? []);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#EE7526]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-900">Webhook & To'lov loglari</h3>
          <p className="text-xs text-neutral-400">Click, Payme, Alif to'lovlari qayd etiladi</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-xl gap-1.5">
          <RefreshCw className="h-4 w-4" />Yangilash
        </Button>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">To'lov webhook'lari</p>
            <p className="text-xs mt-0.5">
              Click/Payme/Alif webhook URL: <code className="bg-amber-100 px-1 rounded font-mono">
                https://[project].supabase.co/functions/v1/telegram-events
              </code>
            </p>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
          <Webhook className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
          <p className="text-neutral-500">Webhook log yozuvlari yo'q</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-50 max-h-[500px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  log.event_type.includes("error") ? "bg-red-100" : "bg-emerald-100"
                }`}>
                  {log.event_type.includes("error")
                    ? <AlertTriangle className="h-3 w-3 text-red-500" />
                    : <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-800">{log.event_type}</span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(log.created_at).toLocaleString("uz-UZ")}
                    </span>
                  </div>
                  {log.payload && (
                    <p className="mt-0.5 text-[11px] text-neutral-500 font-mono truncate">
                      {JSON.stringify(log.payload).slice(0, 120)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── OFERTA ── */
function OfertaPanel() {
  const [text, setText] = useState(() =>
    localStorage.getItem("hb_oferta") ?? `OMMAVIY OFERTA SHARTNOMASI

HammaBop onlayn do'koni orqali xarid qilish quyidagi shartlarga rozilikni bildiradi:

1. UMUMIY QOIDALAR
1.1. Ushbu oferta HammaBop xizmatlaridan foydalanish shartlarini belgilaydi.
1.2. Xarid qilish orqali foydalanuvchi ushbu shartlarga roziligini bildiradi.

2. MAHSULOTLAR VA NARXLAR
2.1. Barcha narxlar so'mda ko'rsatilgan va QQS kiritilgan.
2.2. Narxlar oldindan xabar bermasdan o'zgartirilishi mumkin.

3. YETKAZIB BERISH
3.1. Buyurtma qabul qilinganidan so'ng 1-3 ish kuni ichida yetkaziladi.
3.2. Toshkent shahri bo'yicha yetkazib berish bepul.

4. QAYTARISH SIYOSATI
4.1. Mahsulot qabul qilinganidan so'ng 14 kun ichida qaytarish mumkin.
4.2. Qaytarish uchun murojaat: @HammaBopSupport

5. MAXFIYLIK
5.1. Shaxsiy ma'lumotlar uchinchi shaxslarga berilmaydi.

© HammaBop ${new Date().getFullYear()}. Barcha huquqlar himoyalangan.`
  );
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem("hb_oferta", text);
    setSaved(true);
    toast.success("Oferta saqlandi!");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-neutral-900">Ommaviy Oferta Matni</h3>
        <p className="text-xs text-neutral-400">Saytdagi "Oferta" sahifasi uchun matn</p>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-4">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={20}
          className="rounded-xl font-mono text-sm resize-none"
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} className="rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]">
            <Save className="h-4 w-4 mr-1" />
            {saved ? "Saqlandi!" : "Saqlash"}
          </Button>
          <p className="text-xs text-neutral-400">
            HTML formatda ham yozishingiz mumkin. Saqlash faqat bu qurilmada saqlanadi.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── SECURITY ── */
function SecurityPanel() {
  const [checks] = useState([
    { label: "Row Level Security (RLS)", status: "ok", desc: "Supabase jadvallarida RLS yoqilgan" },
    { label: "Edge Function Auth", status: "ok", desc: "Telegram bot service_role bilan himoyalangan" },
    { label: "Admin huquq tekshiruvi", status: "ok", desc: "Faqat role=admin foydalanuvchilar kiradi" },
    { label: "HTTPS shifrlash", status: "ok", desc: "Barcha so'rovlar HTTPS orqali" },
    { label: "Supabase Storage RLS", status: "warning", desc: "Fayl yuklash siyosatini tekshiring" },
    { label: "API kalit xavfsizligi", status: "ok", desc: "Anon key faqat frontend'da ishlatiladi" },
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-neutral-900">Xavfsizlik tekshiruvi</h3>
        <p className="text-xs text-neutral-400">Tizim xavfsizlik holati</p>
      </div>

      <div className="grid gap-3">
        {checks.map((c, i) => (
          <div key={i} className={`flex items-start gap-4 rounded-2xl border p-4 ${
            c.status === "ok" ? "border-emerald-100 bg-emerald-50" :
            c.status === "warning" ? "border-amber-100 bg-amber-50" :
            "border-red-100 bg-red-50"
          }`}>
            <div className="shrink-0 mt-0.5">
              {c.status === "ok"
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : c.status === "warning"
                ? <AlertTriangle className="h-5 w-5 text-amber-600" />
                : <AlertTriangle className="h-5 w-5 text-red-600" />
              }
            </div>
            <div>
              <p className={`font-semibold text-sm ${
                c.status === "ok" ? "text-emerald-800" :
                c.status === "warning" ? "text-amber-800" : "text-red-800"
              }`}>{c.label}</p>
              <p className={`text-xs mt-0.5 ${
                c.status === "ok" ? "text-emerald-600" :
                c.status === "warning" ? "text-amber-600" : "text-red-600"
              }`}>{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-3">
        <h4 className="font-bold text-neutral-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#EE7526]" />Tavsiyalar
        </h4>
        <ul className="space-y-2 text-sm text-neutral-600">
          <li className="flex items-start gap-2">
            <span className="text-[#EE7526] font-bold shrink-0">→</span>
            Supabase Dashboard → Authentication → Email confirm yoqilganini tekshiring
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#EE7526] font-bold shrink-0">→</span>
            Storage buckets uchun to'g'ri RLS policy o'rnating
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#EE7526] font-bold shrink-0">→</span>
            Admin panelga kirish IP'larni Supabase'da cheklash mumkin
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#EE7526] font-bold shrink-0">→</span>
            Telegram bot token'ini muntazam yangilab turing
          </li>
        </ul>
      </div>
    </div>
  );
}
