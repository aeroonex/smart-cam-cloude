import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Loader2, Mail, ShieldCheck, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const Login = () => {
  const navigate = useNavigate();
  const { user, authError, clearAuthError } = useSessionContext();
  const [email, setEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setLocalError(null);
    setLocalMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setLocalError(getAuthErrorMessage(error));
      setGoogleLoading(false);
      return;
    }
  };

  const signInWithMagicLink = async () => {
    if (!email.trim()) {
      setLocalError("Email manzilini kiriting.");
      setLocalMessage(null);
      return;
    }

    setEmailLoading(true);
    setLocalError(null);
    setLocalMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setEmailLoading(false);

    if (error) {
      setLocalError(getAuthErrorMessage(error));
      return;
    }

    setLocalMessage("Emailingizga kirish havolasi yuborildi.");
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="container-shell">
        <Button
          asChild
          variant="ghost"
          className="mb-6 rounded-full px-4 text-[#254A34] hover:bg-white/70"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Bosh sahifaga qaytish
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="panel-surface relative overflow-hidden p-6 sm:p-8 lg:p-12">
            <div className="absolute inset-0 bg-[#7CAE7A]/[0.06]" />
            <div className="relative space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#7CAE7A]/25 bg-[#edf4ec] px-4 py-2 text-sm font-semibold text-[#4A7A5A]">
                <img
                  src="/assets/smartcam-logo.png"
                  alt="SmartCam"
                  className="h-8 w-8 rounded-full object-cover"
                />
                SmartCam xavfsizlik tizimi
              </div>

              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-[#1A3828] sm:text-5xl">
                  Hisobingizga kiring va buyurtmalaringizni boshqaring.
                </h1>
                <p className="max-w-xl text-base leading-7 text-[#5C7260] sm:text-lg">
                  Google orqali tez kirish yoki email magic link bilan xavfsiz tarzda
                  SmartCam hisobingizga kiring.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Himoyalangan",
                    text: "Supabase auth va xavfsiz profil saqlash",
                  },
                  {
                    icon: Truck,
                    title: "Tez buyurtma",
                    text: "Savatdan bir necha bosqichda rasmiylashtirish",
                  },
                  {
                    icon: BadgeCheck,
                    title: "Ishonchli",
                    text: "Buyurtma holati va tarixini kuzatish",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-[#dbe7d8] bg-white/85 p-5 shadow-sm"
                  >
                    <item.icon className="mb-3 h-9 w-9 rounded-full bg-[#edf4ec] p-2 text-[#EE7526]" />
                    <h2 className="text-lg font-bold text-[#254A34]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#5C7260]">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-[#dbe7d8] bg-white">
                <img
                  src="/assets/smartcam-hero.png"
                  alt="SmartCam premium kamera"
                  className="h-72 w-full object-cover"
                />
              </div>
            </div>
          </section>

          <section className="panel-surface p-6 sm:p-8">
            <div className="mb-6 space-y-2 text-center">
              <h2 className="text-3xl font-extrabold text-[#1A3828]">Kirish</h2>
              <p className="text-sm leading-6 text-[#5C7260]">
                Google yoki email magic link orqali SmartCam hisobingizga kiring.
              </p>
            </div>

            {authError || localError ? (
              <Alert className="mb-5 rounded-3xl border-[#EE7526]/25 bg-[#fff4ec] text-[#8a4616]">
                <AlertDescription className="flex items-center justify-between gap-3 text-sm">
                  <span>{authError || localError}</span>
                  <button
                    className="font-semibold underline"
                    onClick={() => {
                      clearAuthError();
                      setLocalError(null);
                    }}
                  >
                    Yopish
                  </button>
                </AlertDescription>
              </Alert>
            ) : null}

            {localMessage ? (
              <Alert className="mb-5 rounded-3xl border-[#7CAE7A]/25 bg-[#edf4ec] text-[#2f6b43]">
                <AlertDescription className="text-sm">{localMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-4 rounded-[28px] border border-[#dbe7d8] bg-[#fcfdfc] p-4 sm:p-5">
              <Button
                type="button"
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="h-12 w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]"
              >
                {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Google orqali kirish
              </Button>

              <div className="relative py-2 text-center text-sm text-[#5C7260]">
                <span className="relative z-10 bg-[#fcfdfc] px-3">yoki</span>
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#dbe7d8]" />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4A7A5A]">
                  Email manzili
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a907d]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="siz@email.com"
                    className="h-12 rounded-2xl border-[#dbe7d8] bg-white pl-11"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={signInWithMagicLink}
                  disabled={emailLoading}
                  className="h-12 w-full rounded-full border-[#dbe7d8] bg-white text-[#254A34] hover:bg-[#edf4ec]"
                >
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Magic link yuborish
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Login;
