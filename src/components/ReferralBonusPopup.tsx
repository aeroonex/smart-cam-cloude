import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";

type Props = {
  userId: string;
  bonusAmount: number;
  onClose?: () => void;
};

export function ReferralBonusPopup({ userId, bonusAmount, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const key = `ref_popup_${userId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    // Small delay for entrance animation
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, [userId]);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300);
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes rbp-in  { from{opacity:0;transform:translateY(32px) scale(.92)} to{opacity:1;transform:none} }
        @keyframes rbp-out { from{opacity:1;transform:none} to{opacity:0;transform:translateY(20px) scale(.95)} }
        @keyframes rbp-coin { 0%{transform:scale(.5) rotate(-15deg);opacity:0} 60%{transform:scale(1.15) rotate(5deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes rbp-glow { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.4)} 50%{box-shadow:0 0 0 14px rgba(251,191,36,0)} }
        .rbp-card { animation: ${closing ? "rbp-out" : "rbp-in"} .35s cubic-bezier(.34,1.56,.64,1) both; }
        .rbp-coin { animation: rbp-coin .5s .15s cubic-bezier(.34,1.56,.64,1) both, rbp-glow 2s 1s ease-in-out infinite; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm pb-8 px-4"
        onClick={close}
      >
        <div
          className="rbp-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Top gradient band */}
          <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 px-6 pt-8 pb-10 text-center">
            <button
              onClick={close}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Coin icon */}
            <div className="rbp-coin mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
              <Gift className="h-10 w-10 text-yellow-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">Tabriklaymiz! 🎉</h2>
            <p className="text-white/80 text-sm">Referal bonus hisoblandi</p>
          </div>

          {/* Bottom white section */}
          <div className="bg-white px-6 py-6 text-center -mt-4 rounded-t-3xl relative z-10">
            <div className="mb-4">
              <p className="text-4xl font-black text-neutral-900">
                +{bonusAmount.toLocaleString()}
                <span className="text-lg font-semibold text-neutral-500 ml-1">so'm</span>
              </p>
              <p className="text-sm text-neutral-500 mt-1">Hamyoningizga qo'shildi</p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 mb-5 text-left">
              <p className="text-xs text-amber-700 font-semibold mb-0.5">Bonus qanday ishlaydi?</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Referal kod kiritsangiz — ikkalangiz ham bonus olasiz. Bonus hamyon hisobida saqlanib, keyingi xaridda ishlatiladi.
              </p>
            </div>

            <button
              onClick={close}
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3.5 text-sm font-bold text-white shadow-md active:scale-95 transition"
            >
              Ajoyib, rahmat!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
