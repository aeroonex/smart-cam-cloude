import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bg?: string;
};

/**
 * PageLayout — animatsiya faqat content div da, EMAS root div da.
 * Shu tariqa fixed/sticky children lar to'g'ri ishlaydi.
 */
export function PageLayout({ title, right, children, bg = "bg-[#f5f5f5]" }: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* Root: position:relative yoki transform YO'Q — fixed children uchun */}
      <div className={`min-h-screen ${bg} pb-28 page-enter`}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-neutral-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition active:scale-90"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[17px] font-bold text-neutral-900">{title}</h1>
            <div className="w-9 flex justify-end">{right}</div>
          </div>
        </div>

        {children}
      </div>

      <style>{`
        .page-enter {
          animation: page-fade-in 0.25s ease both;
        }
        @keyframes page-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
