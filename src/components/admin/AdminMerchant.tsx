import { useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Copy, ExternalLink,
  Eye, EyeOff, RefreshCw, Save, Zap, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_URL = "https://vhbrbptcnkzkfdbxehgt.supabase.co";

type Provider = "click" | "payme";

interface PaymentSettings {
  id: string;
  provider: Provider;
  enabled: boolean;
  merchant_id: string | null;
  service_id: string | null;
  merchant_user_id: string | null;
  secret_key: string | null;
  test_mode: boolean;
}

const WEBHOOK_URLS: Record<Provider, string> = {
  click: `${PROJECT_URL}/functions/v1/click-webhook`,
  payme: `${PROJECT_URL}/functions/v1/payme-webhook`,
};

const CLICK_PAYMENT_URL = (serviceId: string, merchantUserId: string, orderId: string, amount: number) =>
  `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantUserId}&amount=${amount}&transaction_param=${orderId}&return_url=${encodeURIComponent(window.location.origin + "/order-success")}`;

const PAYME_PAYMENT_URL = (merchantId: string, orderId: string, amount: number) => {
  const payload = `m=${merchantId};ac.order_id=${orderId};a=${Math.round(amount * 100)}`;
  return `https://checkout.paycom.uz/${btoa(payload)}`;
};

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Nusxalandi!"));
}

function SecretField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••••••••••••"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 pr-10 text-sm font-mono focus:border-[#1d4f8a] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function WebhookRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
      <span className="text-xs text-neutral-500 shrink-0">{label}:</span>
      <code className="flex-1 truncate text-xs text-neutral-700">{url}</code>
      <button onClick={() => copyText(url)} className="shrink-0 text-neutral-400 hover:text-[#1d4f8a]">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ProviderCard({
  provider,
  icon,
  label,
  accentColor,
  settings,
  onSave,
}: {
  provider: Provider;
  icon: React.ReactNode;
  label: string;
  accentColor: string;
  settings: PaymentSettings;
  onSave: (updated: PaymentSettings) => Promise<void>;
}) {
  const [form, setForm] = useState<PaymentSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (key: keyof PaymentSettings, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      toast.success(`${label} sozlamalari saqlandi`);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured =
    provider === "click"
      ? !!(form.service_id && form.merchant_user_id && form.secret_key)
      : !!(form.merchant_id && form.secret_key);

  return (
    <div className={`rounded-2xl border-2 ${form.enabled ? `border-${accentColor}-200` : "border-neutral-200"} bg-white shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 ${form.enabled ? `bg-${accentColor}-50` : "bg-neutral-50"} border-b border-neutral-100`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${form.enabled ? `bg-${accentColor}-100` : "bg-neutral-100"}`}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-neutral-900">{label}</p>
            <p className="text-xs text-neutral-500">
              {form.enabled
                ? isConfigured ? "✓ Faol va sozlangan" : "⚠ Faol, lekin sozlanmagan"
                : "O'chirilgan"}
            </p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center gap-2">
          <span className="text-xs text-neutral-500">{form.enabled ? "Yoqilgan" : "O'chirilgan"}</span>
          <div className="relative">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.enabled}
              onChange={e => set("enabled", e.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-neutral-200 peer-checked:bg-[#1d4f8a] transition-colors" />
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      <div className="p-5 space-y-5">
        {/* Test mode toggle */}
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Test rejimi</p>
            <p className="text-xs text-amber-600">Haqiqiy to'lovlar amalga oshirilmaydi</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.test_mode}
              onChange={e => set("test_mode", e.target.checked)}
            />
            <div className="h-5 w-9 rounded-full bg-amber-200 peer-checked:bg-amber-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </label>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {provider === "click" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">Service ID</label>
                <input
                  value={form.service_id ?? ""}
                  onChange={e => set("service_id", e.target.value)}
                  placeholder="12345"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">Merchant User ID</label>
                <input
                  value={form.merchant_user_id ?? ""}
                  onChange={e => set("merchant_user_id", e.target.value)}
                  placeholder="67890"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[#1d4f8a] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">Secret Key (MD5)</label>
                <SecretField value={form.secret_key ?? ""} onChange={v => set("secret_key", v)} />
              </div>
            </>
          )}

          {provider === "payme" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">Merchant ID (Kassa ID)</label>
                <input
                  value={form.merchant_id ?? ""}
                  onChange={e => set("merchant_id", e.target.value)}
                  placeholder="6523f2e2e9f2aa5c18cbaf7a"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono focus:border-[#1d4f8a] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-600">Secret Key (Payme kabinetdan)</label>
                <SecretField value={form.secret_key ?? ""} onChange={v => set("secret_key", v)} />
                <p className="mt-1 text-[10px] text-neutral-400">
                  Basic Auth: <code>Paycom:{form.secret_key ? "••••••••" : "your_key"}</code>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
            Webhook URL — {label} kabinetiga kiriting
          </p>
          <WebhookRow label="URL" url={WEBHOOK_URLS[provider]} />
          {provider === "click" && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">Click kabineti sozlamalari:</p>
              <p>• my.click.uz → Services → {"{"}Service{"}"}  → Prepare URL</p>
              <p>• Complete URL ham xuddi shu webhook URL</p>
              <p>• HTTP Method: POST</p>
            </div>
          )}
          {provider === "payme" && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">Payme kabineti sozlamalari:</p>
              <p>• merchant.payme.uz → Kassalar → Sozlamalar → Endpoint</p>
              <p>• Format: JSON-RPC 2.0</p>
              <p>• Basic Auth: <code>Paycom:{"<secret_key>"}</code></p>
            </div>
          )}
        </div>

        {/* Payment link example */}
        {isConfigured && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
              To'lov havolasi misoli (ORDER_ID, AMOUNT ni almashtiring)
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
              <code className="flex-1 break-all text-[10px] text-neutral-600 leading-relaxed">
                {provider === "click"
                  ? CLICK_PAYMENT_URL(form.service_id!, form.merchant_user_id!, "ORDER_ID", 100000)
                  : PAYME_PAYMENT_URL(form.merchant_id!, "ORDER_ID", 100000)}
              </code>
              <button
                onClick={() => copyText(
                  provider === "click"
                    ? CLICK_PAYMENT_URL(form.service_id!, form.merchant_user_id!, "ORDER_ID", 100000)
                    : PAYME_PAYMENT_URL(form.merchant_id!, "ORDER_ID", 100000)
                )}
                className="shrink-0 text-neutral-400 hover:text-[#1d4f8a]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Doc link */}
        <a
          href={
            provider === "click"
              ? "https://docs.click.uz/click-api/"
              : "https://developer.help.payme.uz/"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#1d4f8a] hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {label} rasmiy dokumentatsiyasi
        </a>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d4f8a] py-2.5 text-sm font-semibold text-white transition hover:bg-[#163d6e] disabled:opacity-60"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

export function AdminMerchant() {
  const [settings, setSettings] = useState<Record<Provider, PaymentSettings | null>>({
    click: null,
    payme: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payment_settings")
      .select("*")
      .then(({ data, error }) => {
        if (error) { toast.error("Sozlamalarni yuklashda xato"); }
        if (data) {
          const map: Record<string, PaymentSettings> = {};
          data.forEach((r: PaymentSettings) => { map[r.provider] = r; });
          setSettings({ click: map.click ?? null, payme: map.payme ?? null });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (updated: PaymentSettings) => {
    const { error } = await supabase
      .from("payment_settings")
      .update({
        enabled: updated.enabled,
        merchant_id: updated.merchant_id,
        service_id: updated.service_id,
        merchant_user_id: updated.merchant_user_id,
        secret_key: updated.secret_key,
        test_mode: updated.test_mode,
      })
      .eq("provider", updated.provider);
    if (error) throw error;
    setSettings(s => ({ ...s, [updated.provider]: updated }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Merchant integratsiyasi haqida</p>
          <p>Click yoki Payme kabinetidan olingan API kalitlarini quyiga kiriting. Webhook URL ni ham kabinete qo'shishni unutmang — to'lovlar avtomatik tasdiqlanadi.</p>
          <p>Foydalanuvchi to'lov tanlaganda tizim avtomatik to'lov havolasini yaratadi.</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["click", "payme"] as Provider[]).map(p => {
          const s = settings[p];
          const active = s?.enabled;
          const configured = p === "click"
            ? !!(s?.service_id && s?.merchant_user_id && s?.secret_key)
            : !!(s?.merchant_id && s?.secret_key);
          return (
            <div key={p} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${active && configured ? "border-green-200 bg-green-50" : "border-neutral-200 bg-white"}`}>
              {active && configured
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <AlertCircle className="h-5 w-5 text-neutral-300" />}
              <div>
                <p className="text-sm font-bold capitalize text-neutral-900">{p}</p>
                <p className={`text-xs ${active && configured ? "text-green-600" : "text-neutral-400"}`}>
                  {active && configured ? "Faol — webhook ishlaydi" : active ? "Yoqilgan, lekin sozlanmagan" : "O'chirilgan"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provider cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {settings.click && (
          <ProviderCard
            provider="click"
            icon={<Zap className="h-5 w-5 text-blue-600" />}
            label="Click"
            accentColor="blue"
            settings={settings.click}
            onSave={handleSave}
          />
        )}
        {settings.payme && (
          <ProviderCard
            provider="payme"
            icon={<CreditCard className="h-5 w-5 text-indigo-600" />}
            label="Payme"
            accentColor="indigo"
            settings={settings.payme}
            onSave={handleSave}
          />
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <p className="font-bold text-neutral-900">Qanday ishlaydi?</p>
        <ol className="space-y-2 text-sm text-neutral-600 list-decimal list-inside">
          <li>Foydalanuvchi buyurtmada Click yoki Payme tanlaydi</li>
          <li>Tizim avtomatik to'lov havolasini yaratib, foydalanuvchiga yuboradi</li>
          <li>Foydalanuvchi to'lov sistemasi sahifasida to'laydi</li>
          <li>Click / Payme webhook orqali to'lovni tasdiqlaydi</li>
          <li>Buyurtma holati avtomatik <strong>«To'langan»</strong> ga o'tadi</li>
        </ol>
      </div>
    </div>
  );
}
