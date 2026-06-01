import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TelegramCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      const savedState = sessionStorage.getItem("tg_state");
      const codeVerifier = sessionStorage.getItem("tg_code_verifier");

      if (!code || !codeVerifier) {
        setError("Parametrlar topilmadi");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
        return;
      }

      if (state !== savedState) {
        setError("Xavfsizlik xatosi");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
        return;
      }

      sessionStorage.removeItem("tg_state");
      sessionStorage.removeItem("tg_code_verifier");

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              code,
              code_verifier: codeVerifier,
              redirect_uri: "https://aigate.uz/auth/telegram/callback",
            }),
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
        console.error("[telegram-callback]", err);
        const msg = String(err);
        setError(msg);
        toast.error("Kirish muvaffaqiyatsiz. Qayta urinib ko'ring.");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    };

    run();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        {!error ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#229ED9] border-t-transparent" />
            <p className="text-base font-medium text-neutral-600">Telegram orqali kirilmoqda...</p>
          </>
        ) : (
          <p className="text-base font-medium text-red-500">{error} — qaytmoqda...</p>
        )}
      </div>
    </main>
  );
};

export default TelegramCallback;
