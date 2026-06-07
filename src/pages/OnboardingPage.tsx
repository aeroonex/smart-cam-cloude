import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Gift, Loader2, MapPin, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/components/session-context-provider";
import { useWallet } from "@/hooks/useWallet";
import { regions } from "@/constants";
import { haptic } from "@/utils/haptic";
import { toast } from "sonner";

/* ─── CSS ─── */
const CSS = `
  @keyframes ob-in    { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:none} }
  @keyframes ob-back  { from{opacity:0;transform:translateX(-48px)} to{opacity:1;transform:none} }
  @keyframes ob-pop   { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  @keyframes ob-letter{ 0%{transform:scale(.6);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes ob-check { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
  @keyframes ob-fall  { 0%{transform:translateY(-10px) rotate(0);opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0} }
  @keyframes ob-fall2 { 0%{transform:translateY(-10px) rotate(0);opacity:1} 100%{transform:translateY(90vh) rotate(-360deg);opacity:0} }
  @keyframes ob-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.3)} 50%{box-shadow:0 0 0 10px rgba(16,185,129,0)} }
  @keyframes ob-fade  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .ob-in    { animation: ob-in   .42s cubic-bezier(.22,1,.36,1) both }
  .ob-back  { animation: ob-back .42s cubic-bezier(.22,1,.36,1) both }
  .ob-pop   { animation: ob-pop  .4s  cubic-bezier(.34,1.56,.64,1) both }
  .ob-letter{ animation: ob-letter .22s cubic-bezier(.34,1.56,.64,1) both }
  .ob-fade  { animation: ob-fade .5s ease both }

  .ob-btn { transition: transform .1s ease, opacity .1s }
  .ob-btn:active { transform: scale(.96); opacity:.85 }

  .ob-input { transition: border-color .18s, box-shadow .18s }
  .ob-input:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.15);
    outline: none;
  }

  .ob-chip  { transition: all .15s }
  .ob-chip:active { transform: scale(.93) }
  .ob-chip.sel { animation: ob-pop .28s cubic-bezier(.34,1.56,.64,1) both }

  .ob-geo  { animation: ob-glow 2s ease-in-out infinite }
`;

/* ─── Confetti ─── */
const CC = ["#6366f1","#f97316","#10b981","#f59e0b","#ec4899","#3b82f6","#8b5cf6"];
function Confetti() {
  const items = Array.from({ length: 22 }, (_, i) => ({
    i, c: CC[i%CC.length],
    x: 5 + Math.random()*90,
    d: Math.random()*1.2,
    t: 2.2 + Math.random()*1.8,
    s: 7 + Math.random()*9,
    r: i%3,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {items.map(p => (
        <div key={p.i} style={{
          position:"absolute", left:`${p.x}%`, top:-12,
          width:p.s, height:p.s,
          background:p.c, opacity:.9,
          borderRadius: p.r===0?"50%": p.r===1?"3px":"0",
          animation:`${p.i%2?"ob-fall":"ob-fall2"} ${p.t}s ${p.d}s ease-in both`,
          transform:`rotate(${p.i*17}deg)`,
        }}/>
      ))}
    </div>
  );
}

/* ─── Progress bar ─── */
function ProgressBar({ step }: { step: number }) {
  const pct = ((step) / 3) * 100;
  return (
    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width:`${pct}%`, background:"linear-gradient(90deg,#6366f1,#a855f7)" }} />
    </div>
  );
}

/* ─── Avatar preview ─── */
function AvatarPreview({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() || null;
  const palette = [
    ["#6366f1","#8b5cf6"],["#f97316","#ef4444"],["#10b981","#06b6d4"],
    ["#f59e0b","#f97316"],["#ec4899","#8b5cf6"],["#3b82f6","#6366f1"],
  ];
  const [c1, c2] = letter ? palette[letter.charCodeAt(0) % palette.length] : ["#e5e7eb","#d1d5db"];

  return (
    <div className="flex justify-center mb-5">
      <div className="h-[88px] w-[88px] rounded-[24px] flex items-center justify-center shadow-lg"
        style={{ background: letter ? `linear-gradient(135deg,${c1},${c2})` : "#f3f4f6" }}>
        {letter
          ? <span key={letter} className="ob-letter text-4xl font-black text-white">{letter}</span>
          : <User className="h-10 w-10 text-neutral-300" />
        }
      </div>
    </div>
  );
}

/* ── Earth globe loader ── */
const EARTH_CSS = `
.ob-earth-wrap { display:flex; flex-direction:column; align-items:center; gap:12px; padding:32px 0; }
.ob-earth {
  --watercolor:#3344c1; --landcolor:#7cc133;
  width:7.5em; height:7.5em;
  background-color:var(--watercolor);
  position:relative; overflow:hidden; border-radius:50%;
  box-shadow: inset 0 0.5em rgba(255,255,255,.25), inset 0 -0.5em rgba(0,0,0,.25);
  border:solid 0.15em white;
  animation:ob-earth-start 1s 1;
}
.ob-earth svg:nth-child(1){ position:absolute;bottom:-2em;width:7em;height:auto;animation:ob-round1 5s infinite linear .75s; }
.ob-earth svg:nth-child(2){ position:absolute;top:-3em;width:7em;height:auto;animation:ob-round1 5s infinite linear; }
.ob-earth svg:nth-child(3){ position:absolute;top:-2.5em;width:7em;height:auto;animation:ob-round2 5s infinite linear; }
.ob-earth svg:nth-child(4){ position:absolute;bottom:-2.2em;width:7em;height:auto;animation:ob-round2 5s infinite linear .75s; }
@keyframes ob-earth-start {
  0%,75%{ filter:brightness(500%); box-shadow:none; }
  100%{ filter:brightness(100%); box-shadow:inset 0 .5em rgba(255,255,255,.25),inset 0 -.5em rgba(0,0,0,.25); }
}
@keyframes ob-round1 {
  0%  { left:-2em; opacity:1; transform:skewX(0) rotate(0); }
  30% { left:-6em; opacity:1; transform:skewX(-25deg) rotate(25deg); }
  31% { left:-6em; opacity:0; transform:skewX(-25deg) rotate(25deg); }
  35% { left:7em;  opacity:0; transform:skewX(25deg) rotate(-25deg); }
  45% { left:7em;  opacity:1; transform:skewX(25deg) rotate(-25deg); }
  100%{ left:-2em; opacity:1; transform:skewX(0) rotate(0); }
}
@keyframes ob-round2 {
  0%  { left:5em;  opacity:1; transform:skewX(0) rotate(0); }
  75% { left:-7em; opacity:1; transform:skewX(-25deg) rotate(25deg); }
  76% { left:-7em; opacity:0; transform:skewX(-25deg) rotate(25deg); }
  77% { left:8em;  opacity:0; transform:skewX(25deg) rotate(-25deg); }
  80% { left:8em;  opacity:1; transform:skewX(25deg) rotate(-25deg); }
  100%{ left:5em;  opacity:1; transform:skewX(0) rotate(0); }
}
@keyframes ob-txt-cycle { 0%,33%{opacity:1} 34%,99%{opacity:0} }
`;

const LAND = "#7CC133";
function EarthGlobe({ label }: { label: string }) {
  return (
    <div className="ob-earth-wrap">
      <div className="ob-earth">
        {[
          "M29.4,-17.4C33.1,1.8,27.6,16.1,11.5,31.6C-4.7,47,-31.5,63.6,-43,56C-54.5,48.4,-50.7,16.6,-41,-10.9C-31.3,-38.4,-15.6,-61.5,-1.4,-61C12.8,-60.5,25.7,-36.5,29.4,-17.4Z",
          "M31.7,-55.8C40.3,-50,45.9,-39.9,49.7,-29.8C53.5,-19.8,55.5,-9.9,53.1,-1.4C50.6,7.1,43.6,14.1,41.8,27.6C40.1,41.1,43.4,61.1,37.3,67C31.2,72.9,15.6,64.8,1.5,62.2C-12.5,59.5,-25,62.3,-31.8,56.7C-38.5,51.1,-39.4,37.2,-49.3,26.3C-59.1,15.5,-78,7.7,-77.6,.2C-77.2,-7.2,-57.4,-14.5,-49.3,-28.4C-41.2,-42.4,-44.7,-63,-38.5,-70.1C-32.2,-77.2,-16.1,-70.8,-2.3,-66.9C11.6,-63,23.1,-61.5,31.7,-55.8Z",
          "M30.6,-49.2C42.5,-46.1,57.1,-43.7,67.6,-35.7C78.1,-27.6,84.6,-13.8,80.3,-2.4C76.1,8.9,61.2,17.8,52.5,29.1C43.8,40.3,41.4,53.9,33.7,64C26,74.1,13,80.6,2.2,76.9C-8.6,73.1,-17.3,59,-30.6,52.1C-43.9,45.3,-61.9,45.7,-74.1,38.2C-86.4,30.7,-92.9,15.4,-88.6,2.5C-84.4,-10.5,-69.4,-20.9,-60.7,-34.6C-52.1,-48.3,-49.8,-65.3,-40.7,-70C-31.6,-74.8,-15.8,-67.4,-3.2,-61.8C9.3,-56.1,18.6,-52.3,30.6,-49.2Z",
          "M39.4,-66C48.6,-62.9,51.9,-47.4,52.9,-34.3C53.8,-21.3,52.4,-10.6,54.4,1.1C56.3,12.9,61.7,25.8,57.5,33.2C53.2,40.5,39.3,42.3,28.2,46C17,49.6,8.5,55.1,1.3,52.8C-5.9,50.5,-11.7,40.5,-23.6,37.2C-35.4,34,-53.3,37.5,-62,32.4C-70.7,27.4,-70.4,13.7,-72.4,-1.1C-74.3,-15.9,-78.6,-31.9,-73.3,-43C-68.1,-54.2,-53.3,-60.5,-39.5,-60.9C-25.7,-61.4,-12.9,-56,1.1,-58C15.1,-59.9,30.2,-69.2,39.4,-66Z",
        ].map((d, i) => (
          <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <path transform="translate(100 100)" d={d} fill={LAND} />
          </svg>
        ))}
      </div>
      <p className="text-sm font-semibold text-neutral-600">{label}</p>
    </div>
  );
}

type GeoResult = {
  region: string;
  country: string;
  state: string;
  city: string;
  street: string;
  road: string;
  lat: number;
  lng: number;
  full: string;
};

/* ══════════════════════════════
         MAIN
══════════════════════════════ */
export default function OnboardingPage() {
  const { user } = useSessionContext();
  const navigate  = useNavigate();
  const { redeemReferralCode } = useWallet(user);
  const [step, setStep]     = useState(0);
  const [dir,  setDir]      = useState<"f"|"b">("f");
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [refInput, setRefInput]   = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const [refApplied, setRefApplied] = useState(false);
  const [geoLoad, setGeoLoad] = useState(false);
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geoError, setGeoError]   = useState("");
  const [geoLabel, setGeoLabel]   = useState("Tekshiryapmiz...");
  const [showManual, setShowManual] = useState(false);
  const nameRef  = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const geoLabelTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("full_name,phone,region").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.full_name) setName(data.full_name);
        if (data?.phone) setPhone(data.phone.replace("+998","").replace(/\D/g,"").slice(0,9));
        if (data?.region) setRegion(data.region);
      });
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 1) nameRef.current?.focus();
      if (step === 2) phoneRef.current?.focus();
    }, 380);
    return () => clearTimeout(t);
  }, [step]);

  /* Auto-detect when entering step 3 */
  useEffect(() => {
    if (step === 3) {
      setGeoResult(null);
      setGeoError("");
      setShowManual(false);
      runDetectGeo();
    }
    return () => { if (geoLabelTimer.current) clearInterval(geoLabelTimer.current); };
  }, [step]);

  function startLabelCycle() {
    const labels = ["Tekshiryapmiz...", "Sizni qidiryapmiz...", "Aniqlanmoqda..."];
    let i = 0;
    setGeoLabel(labels[0]);
    geoLabelTimer.current = setInterval(() => {
      i = (i + 1) % labels.length;
      setGeoLabel(labels[i]);
    }, 1800);
  }

  function stopLabelCycle() {
    if (geoLabelTimer.current) { clearInterval(geoLabelTimer.current); geoLabelTimer.current = null; }
  }

  async function runDetectGeo() {
    if (!navigator.geolocation) {
      setGeoError("Qurilma joylashuvni qo'llab-quvvatlamaydi");
      setShowManual(true);
      return;
    }
    setGeoLoad(true);
    startLabelCycle();
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 12000, enableHighAccuracy: true })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "uz,ru,en" } }
      );
      const d = await r.json() as { display_name?: string; address?: Record<string, string> };
      const addr = d.address || {};
      const stateRaw = (addr.state || addr.province || addr.region || "").toLowerCase();

      const regionMap: Record<string, string> = {
        "toshkent shahar": "Toshkent shahri", "toshkent city": "Toshkent shahri",
        "toshkent": "Toshkent viloyati", "samarqand": "Samarqand viloyati",
        "buxoro": "Buxoro viloyati", "farg'ona": "Farg'ona viloyati", "fergana": "Farg'ona viloyati",
        "andijon": "Andijon viloyati", "namangan": "Namangan viloyati",
        "qashqadaryo": "Qashqadaryo viloyati", "kashkadarya": "Qashqadaryo viloyati",
        "surxondaryo": "Surxondaryo viloyati", "navoiy": "Navoiy viloyati",
        "xorazm": "Xorazm viloyati", "jizzax": "Jizzax viloyati", "sirdaryo": "Sirdaryo viloyati",
        "karakalpak": "Qoraqalpog'iston R.", "qoraqalpog": "Qoraqalpog'iston R.",
      };
      let foundRegion = "";
      for (const [k, v] of Object.entries(regionMap)) {
        if (stateRaw.includes(k)) { foundRegion = v; break; }
      }

      const city   = addr.city || addr.town || addr.village || addr.suburb || "";
      const road   = addr.road || addr.street || addr.pedestrian || "";
      const country = addr.country || "O'zbekiston";
      const stateName = addr.state || addr.province || "";

      const parts = [country, stateName, city, road].filter(Boolean);
      const full = parts.join(", ");

      stopLabelCycle();
      haptic.success();
      setGeoResult({ region: foundRegion, country, state: stateName, city, street: road, road, lat, lng, full });
      if (foundRegion) setRegion(foundRegion);
    } catch (e: unknown) {
      stopLabelCycle();
      const msg = (e as GeolocationPositionError)?.code === 1
        ? "Ruxsat berilmadi — qo'lda tanlang"
        : "Joylashuv aniqlanmadi";
      setGeoError(msg);
      setShowManual(true);
    } finally {
      setGeoLoad(false);
    }
  }

  function go(n: number) {
    haptic.medium();
    setDir(n > step ? "f" : "b");
    setStep(n);
  }

  function handlePhone(v: string) {
    setPhone(v.replace(/\D/g,"").slice(0,9));
  }

  async function finish() {
    if (!user) return;
    if (!name.trim())   { haptic.error(); toast.error("Ism kiriting"); return; }
    if (phone.length<9) { haptic.error(); toast.error("Telefon to'liq emas"); return; }
    if (!region)        { haptic.error(); toast.error("Viloyat tanlanmadi"); return; }
    haptic.success();
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("users").update({
      full_name: name.trim(),
      phone: `+998${phone}`,
      region,
    } as any).eq("id", user.id);
    localStorage.setItem(`ob_done_${user.id}`, "1");
    setSaving(false);
    go(4);
  }

  function nextName()  { if (!name.trim())   { haptic.error(); nameRef.current?.focus(); return; } go(2); }
  function nextPhone() { if (phone.length<9) { haptic.error(); phoneRef.current?.focus(); return; } go(3); }

  const slide = dir==="f" ? "ob-in" : "ob-back";

  /* ─── Layout shell for steps 1-3 ─── */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col h-full">
      {/* top nav */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => go(step-1)}
            className="ob-btn h-9 w-9 rounded-xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-neutral-500" />
          </button>
          <div className="flex-1"><ProgressBar step={step} /></div>
          <span className="text-xs font-semibold text-neutral-400">{step}/3</span>
        </div>
      </div>
      {/* scrollable body */}
      <div className={`${slide} flex-1 overflow-y-auto px-4 pb-6`}>
        {children}
      </div>
    </div>
  );

  /* ══════ STEP 0 — WELCOME ══════ */
  if (step === 0) return (
    <div className="fixed inset-0 bg-white flex flex-col px-6 py-10 overflow-y-auto">
      <style>{CSS}</style>

      {/* Logo */}
      <div className="ob-fade flex items-center gap-2 mb-12" style={{ animationDelay:".05s" }}>
        <div className="h-8 w-8 rounded-lg bg-[#1d4f8a] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <path d="M7 6C7 6 7 8 8.5 9.5L11 12L11 24C11 26 9 27.5 7.5 29L7.5 30L13 30L13 18.5L23 18.5L23 30L28.5 30L28.5 29C27 27.5 25 26 25 24L25 12L27.5 9.5C29 8 29 6 29 6L23 6C23 6 23 8 21.5 9.5L19 12L17 12L14.5 9.5C13 8 13 6 13 6Z" fill="white"/>
          </svg>
        </div>
        <span className="font-bold text-neutral-800 text-base">HammaBop</span>
      </div>

      {/* Main text */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="ob-fade" style={{ animationDelay:".12s" }}>
          <p className="text-neutral-400 text-sm mb-3">Xush kelibsiz 👋</p>
          <h1 className="text-3xl font-bold text-neutral-900 leading-snug mb-8">
            O'zingizga kerakli<br />mahsulotni toping<br />va buyurtma bering.
          </h1>
        </div>

        <div className="ob-fade flex flex-col gap-4" style={{ animationDelay:".22s" }}>
          {[
            { icon:"🚚", title:"Tez yetkazish", sub:"1–3 kun ichida" },
            { icon:"💳", title:"Qulay to'lov", sub:"Click, Payme, naqd" },
            { icon:"📦", title:"Keng tanlov", sub:"1000+ mahsulot" },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-4">
              <span className="text-2xl w-8 text-center shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-neutral-800">{f.title}</p>
                <p className="text-xs text-neutral-400">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral code (optional) */}
      <div className="ob-fade mt-6" style={{ animationDelay:".3s" }}>
        {!refApplied ? (
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold text-neutral-500 mb-2 flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-yellow-500" />
              Referal kodingiz bormi? (ixtiyoriy)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={refInput}
                onChange={e => setRefInput(e.target.value.toUpperCase())}
                placeholder="Masalan: AB12CD"
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-[#1d4f8a]"
              />
              <button
                onClick={async () => {
                  if (!refInput.trim()) return;
                  setRefLoading(true);
                  const result = await redeemReferralCode(refInput);
                  setRefLoading(false);
                  if (result.ok) {
                    setRefApplied(true);
                    haptic.success();
                    toast.success(result.message);
                  } else {
                    haptic.error();
                    toast.error(result.message);
                  }
                }}
                disabled={refLoading || !refInput.trim()}
                className="rounded-xl bg-[#1d4f8a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {refLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Qo'lla"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
            <span className="text-emerald-600 text-lg">🎁</span>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Referal kod qabul qilindi!</p>
              <p className="text-xs text-emerald-600">+5 000 so'm bonus hisobingizga qo'shildi</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="ob-fade mt-4" style={{ animationDelay:".35s" }}>
        <button onClick={() => go(1)}
          className="ob-btn w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white bg-[#1d4f8a]">
          Boshlash
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="text-neutral-400 text-xs text-center mt-3">3 ta savol • 1 daqiqa</p>
      </div>
    </div>
  );

  /* ══════ STEP 1 — ISM ══════ */
  if (step === 1) return (
    <div className="fixed inset-0 bg-[#f8f9ff]">
      <style>{CSS}</style>
      <Shell>
        <AvatarPreview name={name} />
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold text-neutral-900">Ismingiz nima?</h2>
          <p className="text-neutral-500 text-sm mt-1">Biz siz bilan to'g'ridan-to'g'ri muloqot qilamiz</p>
        </div>
        <div className="relative mb-4">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400 pointer-events-none" style={{width:18,height:18}} />
          <input ref={nameRef} value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key==="Enter" && nextName()}
            placeholder="Ism Familiya"
            className="ob-input w-full rounded-2xl border-2 border-neutral-200 bg-white pl-11 pr-4 py-3.5 text-[16px] font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-300"
          />
        </div>
        <button onClick={nextName} disabled={!name.trim()}
          className="ob-btn w-full rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-40"
          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          Keyingi →
        </button>
      </Shell>
    </div>
  );

  /* ══════ STEP 2 — TELEFON ══════ */
  if (step === 2) return (
    <div className="fixed inset-0 bg-[#f8f9ff]">
      <style>{CSS}</style>
      <Shell>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">Telefon raqamingiz</h2>
          <p className="text-neutral-400 text-sm">Buyurtma holati xabarlari yuboriladi</p>
        </div>

        {/* bitta katta input — prefix ichida */}
        <div className="ob-input rounded-2xl border-2 border-neutral-200 bg-white flex items-center px-4 gap-2 mb-4"
          onClick={() => phoneRef.current?.focus()}
          style={{ cursor:"text" }}>
          <span className="text-lg shrink-0">🇺🇿</span>
          <span className="text-neutral-500 font-semibold text-base shrink-0">+998</span>
          <div className="w-px h-5 bg-neutral-200 shrink-0" />
          <input
            ref={phoneRef}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
            onKeyDown={e => e.key === "Enter" && nextPhone()}
            type="tel"
            inputMode="numeric"
            placeholder="901234567"
            autoFocus
            className="flex-1 py-4 text-[18px] font-semibold text-neutral-900 bg-transparent outline-none placeholder:text-neutral-300 placeholder:font-normal"
          />
          {phone.length > 0 && (
            <button onClick={() => setPhone("")}
              className="shrink-0 h-5 w-5 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold">
              ✕
            </button>
          )}
        </div>

        {/* progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {Array.from({length:9}).map((_,i) => (
            <div key={i} className="h-1 rounded-full transition-all duration-150"
              style={{
                width: i < phone.length ? 20 : 12,
                background: i < phone.length ? "#f97316" : "#e5e7eb",
              }} />
          ))}
        </div>

        <button onClick={nextPhone} disabled={phone.length < 9}
          className="ob-btn w-full rounded-2xl py-4 text-sm font-semibold text-white disabled:opacity-35"
          style={{ background:"#f97316" }}>
          Keyingi →
        </button>
      </Shell>
    </div>
  );

  /* ══════ STEP 3 — VILOYAT ══════ */
  if (step === 3) return (
    <div className="fixed inset-0 bg-[#f8f9ff]">
      <style>{CSS}{EARTH_CSS}</style>
      <Shell>
        <div className="mb-3 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">Manzilingizni aniqlaymiz</h2>
          <p className="text-neutral-400 text-sm">GPS orqali aniq joylashuvingiz topiladi</p>
        </div>

        {/* ── Loading state ── */}
        {geoLoad && (
          <div className="ob-fade flex flex-col items-center py-4">
            <EarthGlobe label={geoLabel} />
          </div>
        )}

        {/* ── Result state ── */}
        {!geoLoad && geoResult && (
          <div className="ob-fade">
            {/* Map pin visual */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-md"
                style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>
                <MapPin className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Address card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 mb-4">
              <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wide">✅ Manzil aniqlandi</p>
              <div className="space-y-1.5">
                {geoResult.country && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🌍</span>
                    <span className="text-sm text-neutral-700 font-medium">{geoResult.country}</span>
                  </div>
                )}
                {geoResult.state && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">📍</span>
                    <span className="text-sm text-neutral-700 font-medium">{geoResult.state}</span>
                  </div>
                )}
                {geoResult.city && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🏙️</span>
                    <span className="text-sm text-neutral-700">{geoResult.city}</span>
                  </div>
                )}
                {geoResult.road && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🛣️</span>
                    <span className="text-sm text-neutral-600">{geoResult.road}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-1 border-t border-emerald-100">
                  <span className="text-xs">📡</span>
                  <span className="text-xs text-neutral-400">{geoResult.lat.toFixed(5)}, {geoResult.lng.toFixed(5)}</span>
                </div>
              </div>
            </div>

            <button onClick={() => { if(!region){haptic.error();return;} finish(); }}
              disabled={!region || saving}
              className="ob-btn w-full rounded-2xl py-4 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Davom etish →"}
            </button>

            <button onClick={() => setShowManual(v => !v)}
              className="w-full text-center text-xs text-neutral-400 mt-3 py-1">
              {showManual ? "Yashirish ▲" : "Qo'lda o'zgartirish ▼"}
            </button>
          </div>
        )}

        {/* ── Error / manual ── */}
        {!geoLoad && geoError && (
          <div className="ob-fade mb-3 rounded-2xl bg-amber-50 border border-amber-100 p-3">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="text-sm text-amber-700 font-semibold">GPS ruxsat berilmadi</p>
                <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  {geoError.includes("Ruxsat")
                    ? "Brauzer sozlamasida joylashuv ruxsatini yoqing yoki quyidan viloyatni tanlang."
                    : geoError}
                </p>
                <button onClick={runDetectGeo}
                  className="mt-2 text-xs text-emerald-600 font-semibold underline">
                  Qayta urinish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Manual chips ── */}
        {!geoLoad && (showManual || (!geoResult && !geoLoad)) && (
          <div className="ob-fade">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-xs text-neutral-400">yoki viloyat tanlang</span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              {regions.map(r => {
                const sel = region === r;
                return (
                  <button key={r} onClick={() => { haptic.select(); setRegion(r); }}
                    className={`ob-chip rounded-xl px-3 py-2 text-xs font-semibold border-2 ${sel ? "sel" : ""}`}
                    style={sel
                      ? { background:"#ecfdf5", borderColor:"#10b981", color:"#065f46" }
                      : { background:"white", borderColor:"#e5e7eb", color:"#374151" }
                    }>
                    {sel && "✓ "}{r}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { if(!region){haptic.error();return;} finish(); }}
              disabled={!region || saving}
              className="ob-btn w-full rounded-2xl py-4 text-sm font-semibold text-white disabled:opacity-40 mt-3"
              style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Tayyor! 🎉"}
            </button>
          </div>
        )}
      </Shell>
    </div>
  );

  /* ══════ STEP 4 — DONE ══════ */
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background:"#0a0f1e" }}>
      <style>{CSS}{DONE_CSS}</style>
      <Confetti />

      {/* animated glow orbs */}
      <div className="ob-orb ob-orb1" />
      <div className="ob-orb ob-orb2" />
      <div className="ob-orb ob-orb3" />

      {/* stars */}
      {STARS.map((s,i) => (
        <div key={i} className="ob-star" style={{ left:`${s.x}%`, top:`${s.y}%`, width:s.r, height:s.r, animationDelay:`${s.d}s`, animationDuration:`${s.t}s` }} />
      ))}

      {/* content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-10">

        {/* top badge */}
        <div className="ob-fade" style={{ animationDelay:".05s" }}>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/60 text-xs font-medium">Profil tayyor</span>
          </div>
        </div>

        {/* center */}
        <div className="flex flex-col items-center w-full max-w-sm">

          {/* big checkmark ring */}
          <div className="ob-pop mb-6 relative" style={{ animationDelay:".1s" }}>
            {/* outer glow ring */}
            <div className="ob-ring1" />
            <div className="ob-ring2" />
            {/* icon */}
            <div className="relative h-28 w-28 rounded-[32px] flex items-center justify-center"
              style={{
                background:"linear-gradient(145deg,#10b981,#059669)",
                boxShadow:"0 0 0 1px rgba(16,185,129,.3), 0 20px 60px rgba(16,185,129,.5)",
              }}>
              {/* shine */}
              <div className="absolute inset-0 rounded-[32px] overflow-hidden">
                <div className="absolute top-1 left-3 right-3 h-8 rounded-full opacity-20"
                  style={{ background:"linear-gradient(180deg,white,transparent)" }} />
              </div>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7"
                  strokeDasharray="60" strokeDashoffset="60"
                  style={{ animation:"ob-check .6s .4s cubic-bezier(.22,1,.36,1) forwards" }} />
              </svg>
            </div>
          </div>

          {/* name + subtitle */}
          <div className="ob-fade text-center mb-7" style={{ animationDelay:".25s" }}>
            <h1 className="font-black text-white mb-2 leading-tight"
              style={{ fontSize:"clamp(1.6rem,7vw,2.2rem)" }}>
              Barakalla,<br />{name.split(" ")[0]}! 🎉
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Profilingiz muvaffaqiyatli yaratildi.<br />
              Minglab mahsulotlar sizni kutmoqda!
            </p>
          </div>

          {/* stats row */}
          <div className="ob-fade w-full grid grid-cols-3 gap-3 mb-7" style={{ animationDelay:".4s" }}>
            {[
              { icon:"📦", val:"1 000+", lbl:"Mahsulot",     color:"#6366f1" },
              { icon:"🚀", val:"1–3",    lbl:"Kun yetkazish", color:"#f97316" },
              { icon:"⭐", val:"4.9",    lbl:"Reyting",       color:"#f59e0b" },
            ].map(s => (
              <div key={s.lbl} className="rounded-2xl p-3 text-center flex flex-col items-center gap-1"
                style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)" }}>
                <span className="text-xl">{s.icon}</span>
                <span className="font-extrabold text-white text-base leading-none">{s.val}</span>
                <span className="text-[10px] text-white/40 leading-tight">{s.lbl}</span>
              </div>
            ))}
          </div>

          {/* location chip */}
          <div className="ob-fade mb-7" style={{ animationDelay:".5s" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)" }}>
              <span className="text-sm">📍</span>
              <span className="text-white/60 text-xs">{region}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/60 text-xs">+998{phone}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="ob-fade w-full max-w-sm" style={{ animationDelay:".6s" }}>
          <button onClick={() => { haptic.success(); navigate("/", { replace:true }); }}
            className="ob-btn w-full py-4 rounded-2xl text-white font-bold text-sm relative overflow-hidden"
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 12px 40px rgba(99,102,241,.45)" }}>
            {/* shimmer */}
            <span className="ob-shimmer" />
            <span className="relative z-10">Xarid qilishni boshlash →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Done screen extras ── */
const STARS = Array.from({length:30}, (_,i) => ({
  x: Math.random()*100, y: Math.random()*100,
  r: 1+Math.random()*2, d: Math.random()*4, t: 2+Math.random()*3,
}));

const DONE_CSS = `
  @keyframes ob-orb-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.08)} }
  @keyframes ob-star-twinkle { 0%,100%{opacity:.15} 50%{opacity:.8} }
  @keyframes ob-ring-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
  @keyframes ob-shimmer-slide { from{transform:translateX(-100%)} to{transform:translateX(200%)} }

  .ob-orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
  .ob-orb1 { width:340px;height:340px;top:-80px;left:-80px;background:rgba(99,102,241,.25);animation:ob-orb-float 7s ease-in-out infinite; }
  .ob-orb2 { width:280px;height:280px;bottom:-60px;right:-60px;background:rgba(16,185,129,.2);animation:ob-orb-float 9s ease-in-out infinite 2s; }
  .ob-orb3 { width:200px;height:200px;top:40%;left:50%;transform:translate(-50%,-50%);background:rgba(245,158,11,.12);animation:ob-orb-float 11s ease-in-out infinite 4s; }

  .ob-star { position:absolute; border-radius:50%; background:white; animation:ob-star-twinkle var(--t,3s) var(--d,0s) ease-in-out infinite; }

  .ob-ring1 { position:absolute;inset:-16px;border-radius:40px;border:2px solid rgba(16,185,129,.4);animation:ob-ring-pulse 2s .8s ease-out infinite; }
  .ob-ring2 { position:absolute;inset:-32px;border-radius:48px;border:1.5px solid rgba(16,185,129,.2);animation:ob-ring-pulse 2s 1.2s ease-out infinite; }

  .ob-shimmer { position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);animation:ob-shimmer-slide 2.5s 1s ease-in-out infinite; }
`;
