import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowLeft, BadgeCheck, ShieldCheck, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const { user, authError, clearAuthError } = useSessionContext();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

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
                  Google orqali tez kirish, buyurtma tarixi, profil ma'lumotlari va
                  real vaqt yangilanishlari — hammasi bitta joyda.
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
                Google orqali yoki email yordamida SmartCam hisobingizga kiring.
              </p>
            </div>

            {authError ? (
              <Alert className="mb-5 rounded-3xl border-[#EE7526]/25 bg-[#fff4ec] text-[#8a4616]">
                <AlertDescription className="flex items-center justify-between gap-3 text-sm">
                  <span>{authError}</span>
                  <button className="font-semibold underline" onClick={clearAuthError}>
                    Yopish
                  </button>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-[28px] border border-[#dbe7d8] bg-[#fcfdfc] p-4 sm:p-5">
              <Auth
                supabaseClient={supabase}
                providers={["google"]}
                redirectTo={window.location.origin}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: "#EE7526",
                        brandAccent: "#d8661c",
                        defaultButtonBackground: "#ffffff",
                        defaultButtonBackgroundHover: "#edf4ec",
                        defaultButtonBorder: "#dbe7d8",
                        defaultButtonText: "#1A3828",
                        inputBackground: "#ffffff",
                        inputBorder: "#dbe7d8",
                        inputBorderHover: "#7CAE7A",
                        inputBorderFocus: "#EE7526",
                        inputText: "#1C2E1E",
                        inputLabelText: "#4A7A5A",
                        messageText: "#5C7260",
                      },
                      radii: {
                        buttonBorderRadius: "999px",
                        inputBorderRadius: "18px",
                      },
                      space: {
                        inputPadding: "14px",
                        buttonPadding: "14px",
                      },
                    },
                  },
                }}
                theme="light"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Login;
