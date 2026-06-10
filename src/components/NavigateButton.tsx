import { Navigation } from "lucide-react";
import { openNavigation, type GeoPoint } from "@/utils/maps";
import { track } from "@/utils/analytics";

type Props = {
  dest: GeoPoint;
  from?: GeoPoint;
  label?: string;
  className?: string;
};

/**
 * #5 — Kuryer uchun: bosilganda native navigator (Yandex/Google Maps)
 * "Deep Link" orqali ochilib, mijoz manziliga yo'nalish chizadi.
 */
export function NavigateButton({ dest, from, label = "Navigatorda ochish", className }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        track("button_click", { action: "navigate" });
        void openNavigation(dest, from);
      }}
      className={
        className ??
        "flex items-center justify-center gap-2 w-full rounded-xl bg-[#1d4f8a] py-2.5 text-[13px] font-bold text-white active:scale-95 transition"
      }
    >
      <Navigation className="h-4 w-4" /> {label}
    </button>
  );
}
