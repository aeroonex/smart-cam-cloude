import { useEffect, useState } from "react";

type Props = {
  orderId: string;
  onClose: () => void;
};

export function OrderSuccess({ orderId, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleClose() {
    setLeaving(true);
    setTimeout(onClose, 350);
  }

  // We show short UUID until order_number loads; parent can pass "HB-000001" format directly
  const shortId = orderId.startsWith("HB-") ? orderId : `#${orderId.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <style>{`
        /* ── Backdrop ── */
        .os-backdrop {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          transition: opacity 0.35s ease;
        }
        .os-card {
          background: #fff;
          border-radius: 28px;
          padding: 36px 28px 32px;
          width: 100%; max-width: 360px;
          text-align: center;
          position: relative;
          box-shadow: 0 32px 80px rgba(0,0,0,0.22);
          transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease;
          overflow: hidden;
        }

        /* ── Confetti dots ── */
        .os-card::before {
          content: '';
          position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
          width: 200px; height: 4px;
          background: linear-gradient(90deg, #1d4f8a, #5de2a3, #f83d3d, #fffcab, #1d4f8a);
          border-radius: 2px;
          animation: os-shimmer 2s linear infinite;
          background-size: 200% 100%;
        }
        @keyframes os-shimmer {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        /* ── Truck loader (uiverse.io by vinodjangid07) ── */
        .os-loader {
          width: fit-content; height: fit-content;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto;
        }
        .truckWrapper {
          width: 200px; height: 100px;
          display: flex; flex-direction: column;
          position: relative;
          align-items: center; justify-content: flex-end;
          overflow-x: hidden;
        }
        .truckBody {
          width: 130px; height: fit-content;
          margin-bottom: 6px;
          animation: os-motion 1s linear infinite;
        }
        @keyframes os-motion {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(3px); }
          100% { transform: translateY(0px); }
        }
        .truckTires {
          width: 130px; height: fit-content;
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 10px 0 15px;
          position: absolute; bottom: 0;
        }
        .truckTires svg { width: 24px; }
        .os-road {
          width: 100%; height: 1.5px;
          background-color: #282828;
          position: relative; bottom: 0;
          align-self: flex-end; border-radius: 3px;
        }
        .os-road::before {
          content: '';
          position: absolute; width: 20px; height: 100%;
          background-color: #282828; right: -50%;
          border-radius: 3px;
          animation: os-road-anim 1.4s linear infinite;
          border-left: 10px solid white;
        }
        .os-road::after {
          content: '';
          position: absolute; width: 10px; height: 100%;
          background-color: #282828; right: -65%;
          border-radius: 3px;
          animation: os-road-anim 1.4s linear infinite;
          border-left: 4px solid white;
        }
        .lampPost {
          position: absolute; bottom: 0; right: -90%;
          height: 90px;
          animation: os-road-anim 1.4s linear infinite;
        }
        @keyframes os-road-anim {
          0%   { transform: translateX(0px); }
          100% { transform: translateX(-350px); }
        }

        /* ── Text animations ── */
        .os-badge  { animation: os-pop  0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .os-title  { animation: os-fade 0.5s ease 0.3s both; }
        .os-sub    { animation: os-fade 0.5s ease 0.45s both; }
        .os-order  { animation: os-fade 0.5s ease 0.55s both; }
        .os-hint   { animation: os-fade 0.5s ease 0.7s both; }
        .os-btn    { animation: os-fade 0.5s ease 0.85s both; }
        @keyframes os-pop {
          0%   { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes os-fade {
          0%   { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        className="os-backdrop"
        style={{ opacity: leaving ? 0 : visible ? 1 : 0 }}
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div
          className="os-card"
          style={{
            transform: leaving
              ? "scale(0.94) translateY(20px)"
              : visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(30px)",
            opacity: leaving ? 0 : visible ? 1 : 0,
          }}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-sm font-bold hover:bg-slate-200 transition"
          >✕</button>

          {/* Check badge */}
          <div className="os-badge flex justify-center mb-5">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100">
              <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="os-title text-[22px] font-extrabold text-slate-900 leading-tight">
            Buyurtma qabul qilindi!
          </h2>
          <p className="os-sub mt-1.5 text-[14px] text-slate-500 leading-snug">
            Rahmat! Siz bilan tez orada bog'lanamiz 🎉
          </p>

          {/* Order number */}
          <div className="os-order mt-4 inline-flex items-center gap-2 bg-[#1d4f8a]/8 rounded-xl px-4 py-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Buyurtma №</span>
            <span className="font-mono font-extrabold text-[15px] text-[#1d4f8a]">{shortId}</span>
          </div>

          {/* Truck animation */}
          <div className="os-hint mt-6 mb-2">
            <div className="os-loader">
              <div className="truckWrapper">
                <div className="truckBody">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 198 93" className="trucksvg">
                    <path strokeWidth="3" stroke="#282828" fill="#F83D3D" d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"></path>
                    <path strokeWidth="3" stroke="#282828" fill="#7D7C7C" d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"></path>
                    <path strokeWidth="2" stroke="#282828" fill="#282828" d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"></path>
                    <rect strokeWidth="2" stroke="#282828" fill="#FFFCAB" rx="1" height="7" width="5" y="63" x="187"></rect>
                    <rect strokeWidth="2" stroke="#282828" fill="#282828" rx="1" height="11" width="4" y="81" x="193"></rect>
                    <rect strokeWidth="3" stroke="#282828" fill="#DFDFDF" rx="2.5" height="90" width="121" y="1.5" x="6.5"></rect>
                    <rect strokeWidth="2" stroke="#282828" fill="#DFDFDF" rx="2" height="4" width="6" y="84" x="1"></rect>
                  </svg>
                </div>
                <div className="truckTires">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="tiresvg">
                    <circle strokeWidth="3" stroke="#282828" fill="#282828" r="13.5" cy="15" cx="15"></circle>
                    <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="tiresvg">
                    <circle strokeWidth="3" stroke="#282828" fill="#282828" r="13.5" cy="15" cx="15"></circle>
                    <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
                  </svg>
                </div>
                <div className="os-road"></div>
                <svg xmlSpace="preserve" viewBox="0 0 453.459 453.459" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="lampPost">
                  <path d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0zM232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017h78.747C231.693,100.736,232.77,106.162,232.77,111.694z"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Hint */}
          <p className="os-hint text-[12px] text-slate-400 mt-1">
            Buyurtmangiz holati <strong className="text-slate-600">Buyurtmalarim</strong> bo'limida ko'rinadi
          </p>

          {/* CTA */}
          <button
            onClick={handleClose}
            className="os-btn mt-5 w-full h-12 rounded-2xl text-white font-bold text-[14px] active:scale-[0.98] transition"
            style={{ background: "linear-gradient(135deg,#1d4f8a,#2d6bb5)" }}
          >
            Buyurtmalarimni ko'rish →
          </button>
        </div>
      </div>
    </>
  );
}
