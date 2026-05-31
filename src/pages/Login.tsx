import { useEffect, useRef } from "react";
import { ArrowLeft, BadgeCheck, ShieldCheck, Truck } from "lucide-react";
import { HammaBopLogo } from "@/components/HammaBopLogo";
import { WebGLBackground } from "@/components/WebGLBackground";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/components/session-context-provider";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "HammaBopBot";

declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void;
  }
}

const Login = () => {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const { t } = useI18n();
  const widgetRef = useRef<HTMLDivElement>(null);

  // Allaqachon kirgan bo'lsa, bosh sahifaga yo'naltirish
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [navigate, user]);

  // Telegram widget yuklash
  useEffect(() => {
    if (!widgetRef.current) return;

    window.onTelegramAuth = async (tgUser) => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(tgUser),
          },
        );
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Auth failed");

        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionErr) throw sessionErr;

        navigate("/", { replace: true });
      } catch (err) {
        console.error("[telegram-auth]", err);
        toast.error("Telegram orqali kirib bo'lmadi. Qayta urinib ko'ring.");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "14");
    script.async = true;

    widgetRef.current.innerHTML = "";
    widgetRef.current.appendChild(script);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onTelegramAuth;
    };
  }, [navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Fon */}
      <WebGLBackground className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Button
          asChild
          variant="ghost"
          className="mb-6 rounded-full bg-white/70 px-4 text-neutral-900 backdrop-blur hover:bg-white"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> {t("back_to_home")}
          </Link>
        </Button>

        <div className="grid items-center gap-6 lg:grid-cols-2">
          {/* Chap — branding */}
          <section className="hidden rounded-[32px] border border-white/50 bg-white/40 p-10 shadow-xl backdrop-blur-md lg:block">
            <div className="inline-flex items-center gap-3 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-[#EE7526]">
              <HammaBopLogo size={28} /> HammaBop — Online Marketplace
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-neutral-900">
              Telegram orqali kiring
            </h1>
            <p className="mt-3 text-base leading-7 text-neutral-600">
              Parol yoki email kerak emas — faqat Telegram!
            </p>
            <div className="mt-8 grid gap-4">
              {[
                { icon: ShieldCheck, title: t("feature_secure"), text: "Telegram hisobingiz orqali xavfsiz kirish" },
                { icon: Truck, title: t("feature_fast"), text: t("feature_fast_t") },
                { icon: BadgeCheck, title: t("feature_trust"), text: t("feature_trust_t") },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur"
                >
                  <item.icon className="h-9 w-9 shrink-0 rounded-full bg-orange-100 p-2 text-[#EE7526]" />
                  <div>
                    <h2 className="font-bold text-neutral-900">{item.title}</h2>
                    <p className="text-sm text-neutral-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* O'ng — Telegram widget */}
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-2xl backdrop-blur-xl">
            {/* Telegram icon */}
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#229ED9]/10">
              <svg viewBox="0 0 24 24" className="h-11 w-11 fill-[#229ED9]">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>

            <h2 className="text-center text-2xl font-extrabold text-neutral-900">
              Telegram orqali kiring
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-500">
              Parol yoki email kerak emas — faqat Telegram!
            </p>

            {/* Widget joyi */}
            <div ref={widgetRef} className="mt-7 flex justify-center" />

            <p className="mt-5 max-w-[260px] text-center text-xs text-neutral-400">
              Telegram ma'lumotlaringiz faqat autentifikatsiya uchun ishlatiladi va uchinchi
              shaxslarga berilmaydi.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Login;
