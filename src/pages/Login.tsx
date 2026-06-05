import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HammaBopLogo } from "@/components/HammaBopLogo";

const REDIRECT_URL = window.location.origin;

export default function Login() {
  const navigate = useNavigate();
  const { user } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [navigate, user]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: REDIRECT_URL, queryParams: { prompt: "select_account" } },
    });
    if (error) { toast.error("Kirish xatosi: " + error.message); setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Email va parolni kiriting."); return; }
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Xato: " + error.message); setLoading(false); }
      else navigate("/", { replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { toast.error("Xato: " + error.message); setLoading(false); }
      else { toast.success("Ro'yxatdan o'tdingiz! Emailingizni tasdiqlang."); setMode("login"); setLoading(false); }
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#060d1a]" />
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[#1d4f8a] opacity-35 blur-[120px]" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-[#2860a8] opacity-25 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-[#164078] opacity-30 blur-[110px]" />
        <div className="absolute -bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-[#0d2744] opacity-40 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-[20px] shadow-2xl px-8 py-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-1">
              <HammaBopLogo size={32} />
              <span className="text-xl font-extrabold text-neutral-900 tracking-tight">HammaBop</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Online Marketplace</p>
          </div>

          <h1 className="text-lg font-bold text-neutral-900 text-center mb-5">
            {mode === "login" ? "Hisobingizga kiring" : "Ro'yxatdan o'ting"}
          </h1>

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            {/* Name — only signup */}
            {mode === "signup" && (
              <div>
                <label className="text-sm font-semibold text-[#151717] block mb-1">Ism</label>
                <div className="login-input-wrap">
                  <svg height="20" viewBox="0 -2 32 32" width="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="text-neutral-400 shrink-0">
                    <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                  </svg>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Ismingizni kiriting"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-[#151717] block mb-1">Email</label>
              <div className="login-input-wrap">
                <svg height="18" viewBox="0 0 32 32" width="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="text-neutral-400 shrink-0">
                  <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"/>
                </svg>
                <input
                  type="email"
                  className="login-input"
                  placeholder="Email manzilingiz"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-[#151717] block mb-1">Parol</label>
              <div className="login-input-wrap">
                <svg height="18" viewBox="-64 0 512 512" width="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="text-neutral-400 shrink-0">
                  <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"/>
                  <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"/>
                </svg>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Parolingiz"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full h-[50px] rounded-[10px] bg-[#1d4f8a] text-white text-[15px] font-medium hover:bg-[#164078] transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Yuklanmoqda..." : mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-700 mt-3 mb-3">
            {mode === "login" ? "Hisob yo'qmi?" : "Hisobingiz bormi?"}
            <span
              className="ml-1 text-[#1d4f8a] font-medium cursor-pointer"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Ro'yxatdan o'ting" : "Kirish"}
            </span>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-xs text-neutral-400">yoki</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-[50px] rounded-[10px] border border-[#ededef] bg-white flex items-center justify-center gap-2.5 text-sm font-medium text-neutral-700 hover:border-[#1d4f8a] transition disabled:opacity-60 cursor-pointer"
          >
            <svg viewBox="0 0 512 512" className="h-5 w-5 shrink-0">
              <path fill="#FBBB00" d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456C103.821,274.792,107.225,292.797,113.47,309.408z"/>
              <path fill="#518EF8" d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"/>
              <path fill="#28B446" d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"/>
              <path fill="#F14336" d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0C318.115,0,375.068,22.126,419.404,58.936z"/>
            </svg>
            Google bilan kirish
          </button>
        </div>

        <p className="text-center text-xs text-white/40 mt-5">
          © 2025 HammaBop ·{" "}
          <a href="/" className="hover:text-white/60 transition">Bosh sahifa</a>
        </p>
      </div>
    </div>
  );
}
