import { useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, ChevronRight, Circle,
  ClipboardCopy, Globe, Loader2, Play, Rocket,
  Server, Settings2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type LogLevel = "info" | "success" | "error" | "warn";
interface LogLine {
  id: number;
  level: LogLevel;
  message: string;
  detail?: string;
  ts: number;
}

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1 — Server
  server_ip: string;
  domain: string;
  app_name: string;
  // Step 2 — Brand
  brand_name: string;
  brand_part1: string;
  brand_part2: string;
  brand_color: string;
  brand_color2: string;
  tagline: string;
  support_phone: string;
  support_telegram: string;
  support_tg_bot: string;
  footer_text: string;
  // Step 3 — Supabase
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  supabase_mgmt_token: string;
  telegram_bot_token: string;
}

const EMPTY: FormData = {
  server_ip: "",
  domain: "",
  app_name: "",
  brand_name: "HammaBop",
  brand_part1: "Hamma",
  brand_part2: "Bop",
  brand_color: "#1d4f8a",
  brand_color2: "#EE7526",
  tagline: "",
  support_phone: "",
  support_telegram: "",
  support_tg_bot: "",
  footer_text: "",
  supabase_url: "",
  supabase_anon_key: "",
  supabase_service_role_key: "",
  supabase_mgmt_token: "",
  telegram_bot_token: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Log colors
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_STYLE: Record<LogLevel, string> = {
  info:    "text-sky-400",
  success: "text-emerald-400",
  error:   "text-red-400",
  warn:    "text-amber-400",
};

const LEVEL_ICON: Record<LogLevel, string> = {
  info:    "›",
  success: "✓",
  error:   "✗",
  warn:    "⚠",
};

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
function StepDot({ n, current, done }: { n: Step; current: Step; done: boolean }) {
  const active = current === n;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
            ? "border-[#1d4f8a] bg-[#1d4f8a] text-white shadow-lg shadow-blue-500/30"
            : "border-neutral-200 bg-white text-neutral-400"
        }`}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : n}
      </div>
    </div>
  );
}

function StepBar({ step, done }: { step: Step; done: Set<Step> }) {
  const labels = ["Server & Domen", "Brend", "Supabase"];
  return (
    <div className="flex items-center gap-0">
      {([1, 2, 3] as Step[]).map((n, i) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center">
            <StepDot n={n} current={step} done={done.has(n)} />
            <span className={`mt-1 text-[10px] font-semibold ${step === n ? "text-[#1d4f8a]" : "text-neutral-400"}`}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div className={`mx-2 mb-4 h-0.5 w-12 sm:w-20 transition-all ${done.has(n) ? "bg-emerald-400" : "bg-neutral-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Input helper
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", required, hint, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-neutral-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1d4f8a] focus:ring-2 focus:ring-[#1d4f8a]/15 ${mono ? "font-mono text-xs" : ""}`}
      />
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDeployment() {
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState<Set<Step>>(new Set());
  const [form, setForm] = useState<FormData>(EMPTY);
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [deployDone, setDeployDone] = useState<{ success: boolean; envOutput?: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  const set = (key: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }));

  const pushLog = (line: Omit<LogLine, "id">) => {
    setLogs(prev => {
      const next = [...prev, { ...line, id: logId.current++ }];
      return next.slice(-200); // keep last 200 lines
    });
    // scroll to bottom
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    }, 30);
  };

  const nextStep = () => {
    setDone(d => new Set([...d, step]));
    setStep(s => Math.min(s + 1, 3) as Step);
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1) as Step);

  const startDeploy = async () => {
    setDeploying(true);
    setLogs([]);
    setDeployDone(null);

    pushLog({ level: "info", message: "HammaBop White-Label Deploy Wizard v1.0", ts: Date.now() });
    pushLog({ level: "info", message: `Target: ${form.domain} → ${form.supabase_url}`, ts: Date.now() });
    pushLog({ level: "info", message: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", ts: Date.now() });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-whitelabel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
          }),
        },
      );

      if (!res.ok || !res.body) {
        const text = await res.text();
        pushLog({ level: "error", message: "Server xatosi: " + text, ts: Date.now() });
        setDeploying(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.type === "log") {
              pushLog({ level: evt.level, message: evt.message, detail: evt.detail, ts: evt.ts });
            } else if (evt.type === "done") {
              setDeployDone({ success: evt.success, envOutput: evt.envOutput });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      pushLog({ level: "error", message: "Tarmoq xatosi: " + String(err), ts: Date.now() });
    }

    setDeploying(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d4f8a] to-[#2563eb] shadow-lg">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">White-Label Deploy Wizard</h2>
          <p className="text-xs text-neutral-500">Yangi mijoz uchun ilovani bir marta sozlab, avtomat deploy qiling</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="flex justify-center py-2">
        <StepBar step={step} done={done} />
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* ── Step 1: Server & Domain ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-5 w-5 text-[#1d4f8a]" />
              <h3 className="font-bold text-neutral-800">Server va Domen sozlamalari</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Server IP manzili"
                value={form.server_ip}
                onChange={set("server_ip")}
                placeholder="192.168.1.100"
                hint="Serveringizning IP manzili"
              />
              <Field
                label="Domen nomi"
                value={form.domain}
                onChange={set("domain")}
                placeholder="dokon.uz"
                required
                hint="IP ga yo'naltirilgan domen"
              />
              <Field
                label="Ilova nomi"
                value={form.app_name}
                onChange={set("app_name")}
                placeholder="MyShop"
                required
                hint="Ichki nom (texnik)"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Brand ──────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-[#EE7526]" />
              <h3 className="font-bold text-neutral-800">Brend va Kontakt ma'lumotlari</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sayt nomi (to'liq)" value={form.brand_name} onChange={set("brand_name")} placeholder="HammaBop" required />
              <Field label="Nom 1-qismi (rangli)" value={form.brand_part1} onChange={set("brand_part1")} placeholder="Hamma" />
              <Field label="Nom 2-qismi" value={form.brand_part2} onChange={set("brand_part2")} placeholder="Bop" />
              <Field label="Tagline / Shior" value={form.tagline} onChange={set("tagline")} placeholder="O'zbekistonning eng yaxshi do'koni" />
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Asosiy rang</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.brand_color} onChange={e => set("brand_color")(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                  <span className="font-mono text-xs text-neutral-500">{form.brand_color}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Ikkinchi rang</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.brand_color2} onChange={e => set("brand_color2")(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                  <span className="font-mono text-xs text-neutral-500">{form.brand_color2}</span>
                </div>
              </div>
              <Field label="Qo'llab-quvvatlash telefoni" value={form.support_phone} onChange={set("support_phone")} placeholder="+998901234567" />
              <Field label="Telegram kanal/guruh" value={form.support_telegram} onChange={set("support_telegram")} placeholder="@dokon_support" />
              <Field label="Telegram Bot username" value={form.support_tg_bot} onChange={set("support_tg_bot")} placeholder="@dokon_bot" />
              <div className="sm:col-span-2">
                <Field label="Footer matni" value={form.footer_text} onChange={set("footer_text")} placeholder="© 2026 DokonUz. Barcha huquqlar himoyalangan." />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Supabase ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="h-5 w-5 text-[#3ecf8e]" />
              <h3 className="font-bold text-neutral-800">Supabase Backend sozlamalari</h3>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Qayerdan topiladi?</p>
              <p>• <strong>Project URL & Anon Key:</strong> supabase.com → Project → Settings → API</p>
              <p>• <strong>Service Role Key:</strong> Settings → API → service_role (SECRET)</p>
              <p>• <strong>Management API Token:</strong> supabase.com → Account → Access Tokens</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Supabase Project URL" value={form.supabase_url} onChange={set("supabase_url")}
                placeholder="https://abcdefgh.supabase.co" required mono
                hint="https://{project-ref}.supabase.co ko'rinishida" />
              <Field label="Anon Public Key" value={form.supabase_anon_key} onChange={set("supabase_anon_key")}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required mono />
              <Field label="Service Role Key (SECRET)" value={form.supabase_service_role_key} onChange={set("supabase_service_role_key")}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." mono
                hint="Ixtiyoriy — admin operatsiyalar uchun" />
              <Field label="Management API Token" value={form.supabase_mgmt_token} onChange={set("supabase_mgmt_token")}
                placeholder="sbp_..." required mono
                hint="supabase.com/dashboard/account/tokens sahifasidan yarating" />
              <Field label="Telegram Bot Token" value={form.telegram_bot_token} onChange={set("telegram_bot_token")}
                placeholder="1234567890:ABCDEfghij..." mono
                hint="BotFather dan olingan bot token (@BotFather → /newbot)" />
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
          >
            Orqaga
          </button>

          {step < 3 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 rounded-xl bg-[#1d4f8a] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#163d6e]"
            >
              Keyingi
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={startDeploy}
              disabled={deploying || !form.supabase_url || !form.supabase_mgmt_token}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deploying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Deploy qilinmoqda...</>
              ) : (
                <><Play className="h-4 w-4" /> Deployni boshlash</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Terminal Log Panel ──────────────────────────────────────────────── */}
      {(logs.length > 0 || deploying) && (
        <div className="rounded-2xl border border-neutral-800 bg-[#0d1117] shadow-xl overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-[#161b22] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-2 font-mono text-xs text-white/40">
              deploy-whitelabel — {form.domain || "target"}
            </span>
            {deploying && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse">
                <Circle className="h-2 w-2 fill-current" />
                LIVE
              </span>
            )}
            {deployDone && !deploying && (
              <span className={`ml-auto flex items-center gap-1.5 text-xs ${deployDone.success ? "text-emerald-400" : "text-red-400"}`}>
                {deployDone.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {deployDone.success ? "MUVAFFAQIYATLI" : "XATO"}
              </span>
            )}
          </div>

          {/* Log lines */}
          <div
            ref={logRef}
            className="h-80 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#30363d #0d1117" }}
          >
            {logs.map(line => (
              <div key={line.id} className="flex gap-2 group">
                <span className="text-white/20 shrink-0 select-none w-20">
                  {new Date(line.ts).toLocaleTimeString("uz-UZ", { hour12: false })}
                </span>
                <span className={`shrink-0 w-4 font-bold ${LEVEL_STYLE[line.level]}`}>
                  {LEVEL_ICON[line.level]}
                </span>
                <span className={`${LEVEL_STYLE[line.level]} break-all`}>
                  {line.message}
                </span>
                {line.detail && (
                  <span className="text-white/30 ml-1 break-all">{line.detail}</span>
                )}
              </div>
            ))}
            {deploying && (
              <div className="flex gap-2 items-center">
                <span className="text-white/20 w-20"> </span>
                <span className="text-emerald-400 animate-pulse">▊</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Success: .env output ────────────────────────────────────────────── */}
      {deployDone?.success && deployDone.envOutput && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-emerald-800">Frontend uchun .env konfiguratsiya</h3>
          </div>
          <p className="text-xs text-emerald-700">
            Quyidagi qiymatlarni frontend serveringizning <code className="bg-emerald-100 px-1 rounded">.env</code> fayliga joylashtiring:
          </p>
          <div className="relative">
            <pre className="rounded-xl bg-[#0d1117] p-4 text-xs text-emerald-300 font-mono overflow-x-auto">
              {deployDone.envOutput}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(deployDone.envOutput!);
                toast.success("Nusxalandi!");
              }}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/20"
            >
              <ClipboardCopy className="h-3 w-3" />
              Nusxa olish
            </button>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-2">
            <p className="text-xs font-bold text-neutral-700">Keyingi qadamlar:</p>
            <ol className="list-decimal list-inside text-xs text-neutral-600 space-y-1">
              <li>Yuqoridagi .env qiymatlarini frontend serveriga joylashtiring</li>
              <li>Serverda <code className="bg-neutral-100 px-1 rounded">npm run build</code> buyrug'ini ishga tushiring</li>
              <li><code className="bg-neutral-100 px-1 rounded">{form.domain}</code> domenida <code className="bg-neutral-100 px-1 rounded">{form.server_ip}</code> IP ga A-record qo'shing</li>
              <li>Nginx/Caddy bilan HTTPS sertifikat sozlang</li>
              <li>Supabase dashboard → Authentication → URL Configuration → Site URL ni yangilang</li>
            </ol>
          </div>
        </div>
      )}

      {deployDone && !deployDone.success && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Deploy muvaffaqiyatsiz yakunlandi</p>
            <p className="text-xs text-red-600 mt-1">
              Yuqoridagi log qatorlarini tekshiring. Ko'p hollarda bu noto'g'ri Management API token yoki noto'g'ri project URL sababli bo'ladi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
