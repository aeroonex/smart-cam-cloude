import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  orderId: string;
  onClose: () => void;
};

export function OrderSuccess({ orderId, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleClose() {
    setLeaving(true);
    setTimeout(onClose, 350);
  }

  async function handlePayment() {
    if (paying) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-link", {
        body: { type: "order", orderId },
      });
      if (error || !data?.url) {
        toast.error("Telegram havolasini yaratib bo'lmadi");
        setPaying(false);
        return;
      }
      setPaid(true);
      setTimeout(() => {
        window.open(data.url as string, "_blank", "noopener,noreferrer");
        setPaying(false);
      }, 600);
    } catch {
      toast.error("Xatolik yuz berdi");
      setPaying(false);
    }
  }

  return (
    <>
      <style>{`
        /* ── Overlay backdrop ── */
        .os-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          transition: opacity 0.35s ease;
        }

        /* ── Main card wrapper ── */
        .os-card {
          background: #fff;
          border-radius: 24px;
          padding: 32px 24px 28px;
          width: 100%;
          max-width: 340px;
          text-align: center;
          position: relative;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease;
        }

        /* ── Uiverse payment widget ── */
        .pay-container {
          background-color: #ffffff;
          display: flex;
          width: 270px;
          height: 120px;
          margin: 0 auto;
          position: relative;
          border-radius: 6px;
          transition: 0.3s ease-in-out;
          box-shadow: 0 4px 20px rgba(0,0,0,0.10);
          cursor: pointer;
          overflow: hidden;
        }
        .pay-container:hover {
          transform: scale(1.03);
        }
        .pay-container:hover .pay-left {
          width: 100%;
        }
        .pay-left {
          background-color: #5de2a3;
          width: 130px;
          height: 120px;
          border-radius: 4px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: 0.3s;
          flex-shrink: 0;
          overflow: hidden;
        }
        .pay-right {
          display: flex;
          align-items: center;
          overflow: hidden;
          cursor: pointer;
          justify-content: flex-start;
          white-space: nowrap;
          transition: 0.3s;
          padding-left: 16px;
        }
        .pay-right:hover {
          background-color: #f9f7f9;
        }
        .pay-label {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          font-family: system-ui, sans-serif;
        }
        .pay-card {
          width: 70px;
          height: 46px;
          background-color: #c7ffbc;
          border-radius: 6px;
          position: absolute;
          display: flex;
          z-index: 10;
          flex-direction: column;
          align-items: center;
          box-shadow: 9px 9px 9px -2px rgba(77,200,143,0.72);
        }
        .pay-card-line {
          width: 65px;
          height: 13px;
          background-color: #80ea69;
          border-radius: 2px;
          margin-top: 7px;
        }
        .pay-buttons {
          width: 8px;
          height: 8px;
          background-color: #379e1f;
          box-shadow: 0 -10px 0 0 #26850e, 0 10px 0 0 #56be3e;
          border-radius: 50%;
          transform: rotate(90deg);
          margin: 10px 0 0 -30px;
        }
        .pay-container:hover .pay-card {
          animation: pay-slide-card 1.2s cubic-bezier(0.645,0.045,0.355,1) both;
        }
        .pay-container:hover .pay-post {
          animation: pay-slide-post 1s cubic-bezier(0.165,0.84,0.44,1) both;
        }
        @keyframes pay-slide-card {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(-70px) rotate(90deg); }
          60%  { transform: translateY(-70px) rotate(90deg); }
          100% { transform: translateY(-8px) rotate(90deg); }
        }
        .pay-post {
          width: 63px;
          height: 75px;
          background-color: #dddde0;
          position: absolute;
          z-index: 11;
          border-radius: 6px;
          overflow: hidden;
          top: 120px;
        }
        .pay-post-line {
          width: 47px;
          height: 9px;
          background-color: #545354;
          position: absolute;
          border-radius: 0 0 3px 3px;
          right: 8px;
          top: 8px;
        }
        .pay-post-line::before {
          content: "";
          position: absolute;
          width: 47px;
          height: 9px;
          background-color: #757375;
          top: -8px;
        }
        .pay-screen {
          width: 47px;
          height: 23px;
          background-color: #fff;
          position: absolute;
          top: 22px;
          right: 8px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pay-numbers {
          width: 12px; height: 12px;
          background-color: #838183;
          box-shadow: 0 -18px 0 0 #838183, 0 18px 0 0 #838183;
          border-radius: 2px;
          position: absolute;
          transform: rotate(90deg);
          left: 25px; top: 52px;
        }
        .pay-numbers-line2 {
          width: 12px; height: 12px;
          background-color: #aaa9ab;
          box-shadow: 0 -18px 0 0 #aaa9ab, 0 18px 0 0 #aaa9ab;
          border-radius: 2px;
          position: absolute;
          transform: rotate(90deg);
          left: 25px; top: 68px;
        }
        @keyframes pay-slide-post {
          50%  { transform: translateY(0); }
          100% { transform: translateY(-70px); }
        }
        .pay-dollar {
          position: absolute;
          font-size: 15px;
          font-weight: 700;
          color: #4b953b;
          width: 100%;
          left: 0; top: 0;
          text-align: center;
          opacity: 0;
        }
        .pay-container:hover .pay-dollar {
          animation: pay-dollar-in 0.3s 1s forwards;
        }
        @keyframes pay-dollar-in {
          0%   { opacity: 0; transform: translateY(-5px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ── Success tick on pay ── */
        .pay-success .pay-left {
          background-color: #5de2a3;
          width: 100%;
          animation: none;
        }

        /* ── Success check pop ── */
        .os-check { animation: os-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        @keyframes os-pop {
          0%   { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .os-text { animation: os-fade 0.5s ease 0.3s both; }
        @keyframes os-fade {
          0%   { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .os-widget { animation: os-fade 0.5s ease 0.5s both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="os-backdrop"
        style={{ opacity: leaving ? 0 : visible ? 1 : 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        {/* Main card */}
        <div
          className="os-card"
          style={{
            transform: leaving ? "scale(0.94) translateY(20px)" : visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(30px)",
            opacity: leaving ? 0 : visible ? 1 : 0,
          }}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 text-sm font-bold hover:bg-neutral-200 transition"
          >✕</button>

          {/* Check icon */}
          <div className="os-check flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={2.5} />
            </div>
          </div>

          {/* Text */}
          <div className="os-text mb-1">
            <h2 className="text-[22px] font-extrabold text-neutral-900">Buyurtma qabul qilindi!</h2>
            <p className="mt-1 text-sm text-neutral-500">To'lovni amalga oshiring</p>
            <div className="mt-2 inline-block rounded-xl bg-neutral-100 px-4 py-1 text-xs font-mono font-bold text-neutral-500">
              #{orderId.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* Payment widget */}
          <div className="os-widget mt-6 flex justify-center">
            <div
              className={`pay-container ${paid ? "pay-success" : ""}`}
              onClick={handlePayment}
            >
              <div className="pay-left">
                <div className="pay-card">
                  <div className="pay-card-line" />
                  <div className="pay-buttons" />
                </div>
                <div className="pay-post">
                  <div className="pay-post-line" />
                  <div className="pay-screen">
                    <span className="pay-dollar">
                      {paid ? "✓" : "so'm"}
                    </span>
                  </div>
                  <div className="pay-numbers" />
                  <div className="pay-numbers-line2" />
                </div>
              </div>

              <div className="pay-right">
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400 ml-4" />
                ) : paid ? (
                  <span className="pay-label text-emerald-600">Yuborildi ✓</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="pay-label">To'lovga</span>
                    <MessageCircle className="h-5 w-5 text-[#229ED9] flex-shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hint */}
          <p className="mt-4 text-[11px] text-neutral-400">
            {paid
              ? "Telegram bot orqali to'lovni tasdiqlang"
              : "Ustiga bosib Telegram bot orqali to'lang"}
          </p>

          {/* Skip */}
          <button
            onClick={handleClose}
            className="mt-3 text-[12px] font-medium text-neutral-400 hover:text-neutral-600 transition underline underline-offset-2"
          >
            Keyinroq to'layman
          </button>
        </div>
      </div>
    </>
  );
}
