import { Download, X, Sparkles } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";

/**
 * #11 — Yangilash bildirishnomasi (native ichki oyna uslubida).
 * Majburiy yangilashda yopib bo'lmaydi.
 */
export function UpdateBanner() {
  const { update, forced, installUpdate, dismiss } = useAppUpdate();
  if (!update) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#13172a] p-4 text-white shadow-2xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1d4f8a]">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">HammaBop yangi versiyasi tayyor</p>
          <p className="text-xs text-white/60">{update.notes ?? `Versiya ${update.version}`}</p>
        </div>
        <button onClick={installUpdate}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1d4f8a] px-3.5 py-2 text-sm font-bold active:scale-95 transition">
          <Download className="h-4 w-4" /> Yangilash
        </button>
        {!forced && (
          <button onClick={dismiss} className="shrink-0 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
