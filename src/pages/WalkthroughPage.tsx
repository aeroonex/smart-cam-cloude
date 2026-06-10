import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/session-context-provider";
import { supabase } from "@/integrations/supabase/client";

function Slide1Illustration() {
  return (
    <svg viewBox="0 0 320 320" className="w-72 h-72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="160" cy="160" r="130" fill="#F0F0F0" />
      {/* Shopping bag body */}
      <rect x="95" y="140" width="130" height="100" rx="12" fill="#1A1A1A" />
      {/* Bag handle */}
      <path d="M125 140 C125 110 195 110 195 140" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round" fill="none"/>
      {/* Bag shine */}
      <rect x="110" y="155" width="40" height="6" rx="3" fill="white" opacity="0.3"/>
      {/* Stars */}
      <circle cx="230" cy="100" r="8" fill="#FFD700"/>
      <circle cx="90" cy="90" r="6" fill="#FFD700" opacity="0.6"/>
      <circle cx="250" cy="190" r="5" fill="#FFD700" opacity="0.8"/>
      {/* Small shopping tag */}
      <rect x="145" y="175" width="30" height="22" rx="4" fill="white" opacity="0.9"/>
      <path d="M151 186 L158 193 L169 182" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots decoration */}
      <circle cx="75" cy="170" r="5" fill="#E0E0E0"/>
      <circle cx="62" cy="155" r="3" fill="#E0E0E0"/>
      <circle cx="245" cy="155" r="4" fill="#E0E0E0"/>
      <circle cx="258" cy="170" r="6" fill="#E0E0E0"/>
    </svg>
  );
}

function Slide2Illustration() {
  return (
    <svg viewBox="0 0 320 320" className="w-72 h-72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="160" cy="160" r="130" fill="#F0F0F0" />
      {/* Person body */}
      <ellipse cx="160" cy="230" rx="45" ry="18" fill="#D0D0D0" opacity="0.4"/>
      <rect x="135" y="175" width="50" height="60" rx="12" fill="#1A1A1A"/>
      {/* Person head */}
      <circle cx="160" cy="155" r="28" fill="#1A1A1A"/>
      {/* Arms */}
      <path d="M135 195 L105 215" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round"/>
      <path d="M185 195 L215 180" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round"/>
      {/* Checklist in hand */}
      <rect x="198" y="158" width="40" height="50" rx="6" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
      <path d="M208 174 L213 180 L224 168" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="208" y1="188" x2="228" y2="188" stroke="#D0D0D0" strokeWidth="2" strokeLinecap="round"/>
      <line x1="208" y1="196" x2="224" y2="196" stroke="#D0D0D0" strokeWidth="2" strokeLinecap="round"/>
      {/* Heart */}
      <path d="M100 120 C100 113 108 108 114 113 C120 108 128 113 128 120 C128 130 114 138 114 138 C114 138 100 130 100 120Z" fill="#FF6B6B" opacity="0.9"/>
      {/* Stars */}
      <circle cx="240" cy="115" r="7" fill="#FFD700"/>
      <circle cx="78" cy="200" r="5" fill="#FFD700" opacity="0.7"/>
    </svg>
  );
}

function Slide3Illustration() {
  return (
    <svg viewBox="0 0 320 320" className="w-72 h-72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="160" cy="160" r="130" fill="#F0F0F0" />
      {/* Person raising hand */}
      <ellipse cx="160" cy="245" rx="42" ry="15" fill="#D0D0D0" opacity="0.4"/>
      <rect x="138" y="185" width="44" height="55" rx="10" fill="#1A1A1A"/>
      <circle cx="160" cy="162" r="26" fill="#1A1A1A"/>
      {/* Arms — one raised up */}
      <path d="M138 200 L108 222" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round"/>
      <path d="M182 195 L205 155" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round"/>
      {/* Celebration confetti */}
      <rect x="215" y="130" width="10" height="10" rx="2" fill="#FF6B6B" transform="rotate(20 215 130)"/>
      <rect x="240" y="150" width="8" height="8" rx="2" fill="#FFD700" transform="rotate(-15 240 150)"/>
      <rect x="200" y="108" width="7" height="7" rx="1.5" fill="#6B9FFF" transform="rotate(35 200 108)"/>
      <circle cx="228" cy="120" r="5" fill="#FF6B6B" opacity="0.7"/>
      <circle cx="195" cy="130" r="4" fill="#FFD700" opacity="0.8"/>
      {/* Package boxes */}
      <rect x="75" y="190" width="38" height="32" rx="6" fill="white" stroke="#1A1A1A" strokeWidth="2"/>
      <line x1="75" y1="206" x2="113" y2="206" stroke="#1A1A1A" strokeWidth="2"/>
      <line x1="94" y1="190" x2="94" y2="222" stroke="#1A1A1A" strokeWidth="2"/>
      <rect x="82" y="194" width="12" height="6" rx="2" fill="#1A1A1A" opacity="0.15"/>
    </svg>
  );
}

const SLIDES = [
  {
    Illustration: Slide1Illustration,
    title: "Sifatli mahsulotlar",
    subtitle: "Biz siz uchun eng yuqori sifatli\nmahsulotlarni taqdim etamiz",
  },
  {
    Illustration: Slide2Illustration,
    title: "Sizning qoniqishingiz",
    subtitle: "Sizning qoniqishingiz bizning\nasosiy maqsadimiz",
  },
  {
    Illustration: Slide3Illustration,
    title: "HammaBop bilan xarid!",
    subtitle: "Kundalik ehtiyojlaringizni HammaBop\nbilan hoziroq qondiring!",
  },
];

export default function WalkthroughPage() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { user } = useSessionContext();

  const isLast = current === SLIDES.length - 1;
  const { Illustration, title, subtitle } = SLIDES[current];

  const handleDone = async () => {
    localStorage.setItem("wt_done", "1");
    if (!user) { navigate("/login", { replace: true }); return; }
    const { data } = await supabase.from("users").select("phone,full_name").eq("id", user.id).single();
    if (!data?.phone || !data?.full_name) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleNext = () => {
    if (isLast) { void handleDone(); } else { setCurrent(current + 1); }
  };

  const handleSkip = () => { void handleDone(); };

  return (
    <div className="fixed inset-0 bg-white flex flex-col select-none">
      {/* Illustration top area */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-[#F5F5F5]">
        {/* Skip */}
        <button onClick={handleSkip} className="absolute top-6 right-6 text-neutral-400 text-sm font-medium">
          Skip
        </button>

        {/* Animated illustration */}
        <div key={current} style={{ animation: "wt-in .4s cubic-bezier(.22,1,.36,1) both" }}>
          <Illustration />
        </div>

        <style>{`
          @keyframes wt-in { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:none} }
        `}</style>
      </div>

      {/* Bottom content */}
      <div className="bg-white px-8 pt-8 pb-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-7">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-[6px] rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                background: i === current ? "#111111" : "#E0E0E0",
              }}
            />
          ))}
        </div>

        {/* Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">{title}</h2>
          <p className="text-neutral-400 text-[15px] leading-relaxed whitespace-pre-line">{subtitle}</p>
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full h-[54px] bg-black text-white rounded-2xl font-semibold text-[15px] transition active:scale-[0.98]"
        >
          {isLast ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
