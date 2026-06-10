import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function StaticPageHeader() {
  return (
    <header className="bg-white border-b border-neutral-100 px-5 py-4 flex items-center gap-3">
      <Link to="/" className="h-9 w-9 rounded-2xl border border-neutral-200 flex items-center justify-center">
        <ChevronLeft className="h-5 w-5 text-neutral-900" />
      </Link>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center">
          <span className="text-white font-black text-sm leading-none">H</span>
        </div>
        <span className="font-bold text-neutral-900 text-sm tracking-tight">HammaBop</span>
      </div>
    </header>
  );
}
