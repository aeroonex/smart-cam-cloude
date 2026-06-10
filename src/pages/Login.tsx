import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import {
  hasBiometricSession, isBiometricAvailable, biometricSignIn, enableBiometricLogin,
} from "@/hooks/useBiometric";

const REDIRECT_URL = Capacitor.isNativePlatform()
  ? "uz.hammabop.app://login-callback"
  : window.location.origin;

type View = "lets_in" | "login" | "signup";

/* ── Let's you in illustration ── */
function LetsInIllustration() {
  return (
    <svg viewBox="0 0 280 260" className="w-64 h-56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* desk / table */}
      <rect x="40" y="195" width="200" height="12" rx="6" fill="#E8E8E8"/>
      <rect x="70" y="207" width="14" height="40" rx="4" fill="#E0E0E0"/>
      <rect x="196" y="207" width="14" height="40" rx="4" fill="#E0E0E0"/>
      {/* monitor */}
      <rect x="80" y="120" width="120" height="78" rx="10" fill="#1A1A1A"/>
      <rect x="88" y="128" width="104" height="62" rx="6" fill="#2D2D2D"/>
      <rect x="125" y="198" width="30" height="8" rx="3" fill="#E0E0E0"/>
      {/* screen content */}
      <rect x="96" y="136" width="50" height="6" rx="3" fill="#4D4D4D"/>
      <rect x="96" y="148" width="88" height="4" rx="2" fill="#3D3D3D"/>
      <rect x="96" y="158" width="72" height="4" rx="2" fill="#3D3D3D"/>
      <rect x="96" y="168" width="40" height="14" rx="4" fill="white"/>
      <rect x="100" y="172" width="32" height="6" rx="2" fill="#1A1A1A"/>
      {/* person sitting */}
      <circle cx="185" cy="145" r="18" fill="#D4A574"/>
      {/* hair */}
      <path d="M168 140 C168 125 202 125 202 140" fill="#3D2314"/>
      {/* body */}
      <rect x="168" y="162" width="34" height="38" rx="10" fill="#4A90D9"/>
      {/* arms */}
      <path d="M168 175 L148 188" stroke="#D4A574" strokeWidth="10" strokeLinecap="round"/>
      <path d="M202 175 L218 185" stroke="#D4A574" strokeWidth="10" strokeLinecap="round"/>
      {/* cloud thought */}
      <ellipse cx="225" cy="110" rx="22" ry="14" fill="white" stroke="#E8E8E8" strokeWidth="1.5"/>
      <ellipse cx="213" cy="120" rx="8" ry="6" fill="white" stroke="#E8E8E8" strokeWidth="1.5"/>
      <ellipse cx="207" cy="126" rx="5" ry="4" fill="white" stroke="#E8E8E8" strokeWidth="1.5"/>
      {/* cart icon in cloud */}
      <path d="M217 107 L219 113 L227 113 L225 107" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="220" cy="115" r="1.5" fill="#1A1A1A"/>
      <circle cx="225" cy="115" r="1.5" fill="#1A1A1A"/>
    </svg>
  );
}

/* ── Reusable input field ── */
function InputField({
  type, placeholder, value, onChange, icon, rightIcon, onRightClick,
}: {
  type: string; placeholder: string; value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode; rightIcon?: React.ReactNode; onRightClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 h-[54px] border border-neutral-200 rounded-2xl px-4 bg-white focus-within:border-neutral-400 transition-colors">
      <span className="text-neutral-400 shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-[14px] text-neutral-900 bg-transparent outline-none placeholder:text-neutral-300"
      />
      {rightIcon && (
        <button type="button" onClick={onRightClick} className="text-neutral-400 shrink-0">
          {rightIcon}
        </button>
      )}
    </div>
  );
}

/* ── Google icon ── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 512 512" className="h-5 w-5 shrink-0">
      <path fill="#FBBB00" d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456C103.821,274.792,107.225,292.797,113.47,309.408z"/>
      <path fill="#518EF8" d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"/>
      <path fill="#28B446" d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"/>
      <path fill="#F14336" d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0C318.115,0,375.068,22.126,419.404,58.936z"/>
    </svg>
  );
}

/* ── Email icon ── */
function EmailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

/* ── Lock icon ── */
function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

/* ── User icon ── */
function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("lets_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    if (!hasBiometricSession()) return;
    isBiometricAvailable().then(setBioReady);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => {
      if (!active) return;
      const r = (data as any)?.role;
      const dest = r === "admin" ? "/admin" : (r === "seller" || r === "courier") ? "/seller" : "/";
      navigate(dest, { replace: true });
    });
    return () => { active = false; };
  }, [navigate, user]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: REDIRECT_URL, queryParams: { prompt: "select_account" } },
    });
    if (error) { toast.error("Kirish xatosi: " + error.message); setLoading(false); }
  };

  const handleBiometric = async () => {
    setLoading(true);
    const ok = await biometricSignIn();
    if (!ok) { toast.error("Biometrik kirish bekor qilindi"); setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Email va parolni kiriting."); return; }
    setLoading(true);

    if (view === "login") {
      const ident = email.trim();
      const effectiveEmail = ident.includes("@") ? ident : `${ident.toLowerCase()}@seller.hammabop.app`;
      const { data, error } = await supabase.auth.signInWithPassword({ email: effectiveEmail, password });
      if (error) { toast.error("Xato: " + error.message); setLoading(false); return; }
      const uid = data.user?.id;
      let dest = "/";
      if (uid) {
        const { data: row } = await supabase.from("users").select("role,is_active").eq("id", uid).single();
        if (row && (row as any).is_active === false) {
          await supabase.auth.signOut();
          toast.error("Hisobingiz bloklangan.");
          setLoading(false); return;
        }
        const r = (row as any)?.role;
        dest = r === "admin" ? "/admin" : (r === "seller" || r === "courier") ? "/seller" : "/";
      }
      void enableBiometricLogin();
      navigate(dest, { replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { toast.error("Xato: " + error.message); setLoading(false); }
      else { toast.success("Ro'yxatdan o'tdingiz! Emailingizni tasdiqlang."); setView("login"); setLoading(false); }
    }
  };

  /* ════════════════════
      VIEW: LETS IN
  ════════════════════ */
  if (view === "lets_in") return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10">
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center">
        <LetsInIllustration />
      </div>

      {/* Title */}
      <h1 className="text-[30px] font-bold text-neutral-900 mb-7">Let's you in</h1>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full h-[54px] border border-neutral-200 rounded-2xl flex items-center gap-3 px-5 mb-3 text-[14px] font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Biometric */}
      {bioReady && (
        <button
          onClick={handleBiometric}
          disabled={loading}
          className="w-full h-[54px] border border-neutral-200 rounded-2xl flex items-center gap-3 px-5 mb-3 text-[14px] font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-60"
        >
          <Fingerprint className="h-5 w-5 text-neutral-500 shrink-0" />
          Barmoq izi / Face ID
        </button>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-[13px] text-neutral-400">or</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Password signin */}
      <button
        onClick={() => setView("login")}
        className="w-full h-[54px] bg-black text-white rounded-2xl font-semibold text-[15px] mb-6 transition active:scale-[0.98]"
      >
        Sign in with password
      </button>

      {/* Signup link */}
      <p className="text-center text-[14px] text-neutral-500">
        Don't have an account?{" "}
        <button onClick={() => setView("signup")} className="font-bold text-neutral-900">
          Sign up
        </button>
      </p>
    </div>
  );

  /* ════════════════════
      VIEW: LOGIN / SIGNUP FORM
  ════════════════════ */
  const isSignup = view === "signup";

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10">
      {/* Back button */}
      <button
        onClick={() => setView("lets_in")}
        className="w-9 h-9 border border-neutral-200 rounded-xl flex items-center justify-center mb-8 shrink-0"
      >
        <svg className="h-5 w-5 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      {/* Title */}
      <h1 className="text-[30px] font-bold text-neutral-900 leading-tight mb-8">
        {isSignup ? "Create your\nAccount" : "Login to your\nAccount"}
      </h1>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        {/* Name — signup only */}
        {isSignup && (
          <InputField
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={setName}
            icon={<UserIcon />}
          />
        )}

        {/* Email */}
        <InputField
          type={isSignup ? "email" : "text"}
          placeholder={isSignup ? "Email" : "Email or username"}
          value={email}
          onChange={setEmail}
          icon={<EmailIcon />}
        />

        {/* Password */}
        <InputField
          type={showPwd ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={setPassword}
          icon={<LockIcon />}
          rightIcon={showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          onRightClick={() => setShowPwd(v => !v)}
        />

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setRemember(v => !v)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${remember ? "bg-black border-black" : "border-neutral-300"}`}
          >
            {remember && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
          </div>
          <span className="text-[13px] text-neutral-600">Remember me</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[54px] bg-black text-white rounded-2xl font-semibold text-[15px] mt-2 transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Yuklanmoqda..." : isSignup ? "Sign up" : "Sign in"}
        </button>
      </form>

      {/* Forgot password */}
      {!isSignup && (
        <p className="text-center text-[13px] text-neutral-500 mt-4">Forgot the password?</p>
      )}

      {/* Or continue with */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-[12px] text-neutral-400">or continue with</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Social icons row */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-[54px] h-[54px] border border-neutral-200 rounded-2xl flex items-center justify-center hover:bg-neutral-50 transition disabled:opacity-60"
        >
          <GoogleIcon />
        </button>
        {bioReady && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            className="w-[54px] h-[54px] border border-neutral-200 rounded-2xl flex items-center justify-center hover:bg-neutral-50 transition disabled:opacity-60"
          >
            <Fingerprint className="h-5 w-5 text-neutral-500" />
          </button>
        )}
      </div>

      {/* Switch mode */}
      <p className="text-center text-[14px] text-neutral-500 mt-6">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <button
          onClick={() => setView(isSignup ? "login" : "signup")}
          className="font-bold text-neutral-900"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
